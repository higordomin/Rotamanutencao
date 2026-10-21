#!/usr/bin/env python3
"""Smoke tests de migração a partir dos comandos SQL do arquivo real src/db.ts.
Roda com Python 3 stdlib e SQLite, sem internet ou dependências Node.
"""
import sqlite3
from pathlib import Path
import re

SRC = Path(__file__).resolve().parents[1] / 'src' / 'db.ts'
source = SRC.read_text(encoding='utf8')
match = re.search(r'await db\.execAsync\(`(.*?)`\);', source, re.S)
assert match, 'Schema de inicialização não encontrado no fonte'
schema = match.group(1)
assert '${' not in schema, 'O schema extraído não pode conter interpolação dinâmica'


def open_sqlite(legacy=False):
    conn = sqlite3.connect(':memory:')
    conn.execute('PRAGMA foreign_keys=ON')
    if legacy:
        conn.executescript('''
        CREATE TABLE assets(id TEXT PRIMARY KEY, code TEXT, name TEXT, area TEXT, created_at TEXT);
        CREATE TABLE work_orders(
          id TEXT PRIMARY KEY, title TEXT, description TEXT, category TEXT, priority TEXT,
          asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
          recurrence_days INTEGER, due_date TEXT,
          status TEXT CHECK (status IN ('pending','completed')),
          created_at TEXT, updated_at TEXT
        );
        CREATE TABLE executions(
          id TEXT PRIMARY KEY, order_id TEXT REFERENCES work_orders(id) ON DELETE CASCADE,
          order_title TEXT, notes TEXT, executed_at TEXT,
          previous_due_date TEXT, next_due_date TEXT, asset_label TEXT, category TEXT
        );
        CREATE TABLE execution_photos(
          id TEXT PRIMARY KEY, execution_id TEXT REFERENCES executions(id) ON DELETE CASCADE,
          filename TEXT UNIQUE, mime_type TEXT, created_at TEXT
        );
        ''')
        conn.execute("INSERT INTO assets VALUES ('a','M-01','Motor 01','Produção','2026-10-20T12:00:00Z')")
        conn.execute("INSERT INTO work_orders VALUES ('o','Lubrificação','', 'Lubrificação','Alta','a',30,'2026-10-20','pending','2026-10-20T12:00:00Z','2026-10-20T12:00:00Z')")
        conn.commit()
    conn.executescript(schema)
    for name in ['block_reason', 'blocked_at', 'partial_reason', 'partial_at']:
        existing = [row[1] for row in conn.execute('PRAGMA table_info(work_orders)')]
        if name not in existing:
            if name == 'block_reason':
                conn.execute("ALTER TABLE work_orders ADD COLUMN block_reason TEXT NOT NULL DEFAULT ''")
            elif name == 'blocked_at':
                conn.execute('ALTER TABLE work_orders ADD COLUMN blocked_at TEXT')
            elif name == 'partial_reason':
                conn.execute("ALTER TABLE work_orders ADD COLUMN partial_reason TEXT NOT NULL DEFAULT ''")
            else:
                conn.execute('ALTER TABLE work_orders ADD COLUMN partial_at TEXT')
    fields = [row[1] for row in conn.execute('PRAGMA table_info(executions)')]
    if 'result' not in fields:
        conn.execute("ALTER TABLE executions ADD COLUMN result TEXT NOT NULL DEFAULT 'completed' CHECK(result IN ('completed','partial'))")
    return conn


def test_fresh():
    db = open_sqlite()
    tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert {'assets', 'work_orders', 'executions', 'execution_photos', 'order_events'}.issubset(tables)
    db.execute("INSERT INTO assets (id,code,name,area,created_at) VALUES ('x','T-1','Tanque','Utilidades','2026-10-20T00:00:00Z')")
    db.execute("INSERT INTO work_orders (id,title,description,category,priority,asset_id,recurrence_days,due_date,status,created_at,updated_at) VALUES ('w','Inspecionar','','Inspeção','Média','x',7,'2026-10-20','pending','2026-10-20T00:00:00Z','2026-10-20T00:00:00Z')")
    db.execute("UPDATE work_orders SET block_reason='Aguardando parada',blocked_at='2026-10-20T00:00:00Z' WHERE id='w'")
    db.execute("INSERT INTO order_events(id,order_id,event_type,reason,created_at) VALUES('b','w','blocked','Aguardando parada','2026-10-20T00:00:00Z')")
    assert db.execute("SELECT block_reason FROM work_orders WHERE id='w'").fetchone()[0] == 'Aguardando parada'
    db.execute("UPDATE work_orders SET block_reason='',blocked_at=NULL WHERE id='w'")
    db.execute("INSERT INTO order_events(id,order_id,event_type,reason,created_at) VALUES('r','w','released','','2026-10-20T00:01:00Z')")
    assert db.execute("SELECT count(*) FROM order_events WHERE order_id='w'").fetchone()[0] == 2
    db.execute("DELETE FROM work_orders WHERE id='w'")
    assert db.execute("SELECT count(*) FROM order_events").fetchone()[0] == 0, 'Cascade de eventos deve funcionar'


def test_legacy_upgrade():
    db = open_sqlite(legacy=True)
    assert db.execute('SELECT count(*) FROM work_orders').fetchone()[0] == 1, 'Migração não pode apagar OS antigas'
    assert db.execute("SELECT block_reason FROM work_orders WHERE id='o'").fetchone()[0] == ''
    assert db.execute("SELECT blocked_at FROM work_orders WHERE id='o'").fetchone()[0] is None
    assert db.execute('PRAGMA foreign_key_check').fetchall() == []
    assert db.execute("SELECT partial_reason,partial_at FROM work_orders WHERE id='o'").fetchone() == ('', None)
    db.execute("""INSERT INTO executions(id,order_id,order_title,notes,executed_at,previous_due_date,next_due_date,asset_label,category,result)
        VALUES ('e','o','Lubrificação','Reparo parcial, falta peça','2026-10-20T12:01:00Z','2026-10-20',NULL,'M-01','Lubrificação','partial')""")
    db.execute("UPDATE work_orders SET partial_reason='Falta peça para encerrar',partial_at='2026-10-20T12:01:00Z' WHERE id='o'")
    assert db.execute("SELECT result FROM executions WHERE id='e'").fetchone()[0] == 'partial'
    assert db.execute("SELECT status,due_date FROM work_orders WHERE id='o'").fetchone() == ('pending','2026-10-20')
    db.execute("INSERT INTO order_events(id,order_id,event_type,reason,created_at) VALUES('z','o','blocked','Peças','2026-10-20T00:00:00Z')")
    db.commit()
    try:
        with db:
            db.execute('DELETE FROM work_orders')
            # Insere referência inválida deliberadamente, para garantir rollback
            db.execute("INSERT INTO order_events(id,order_id,event_type,reason,created_at) VALUES('bad','missing','released','','2026-10-20T00:00:00Z')")
    except sqlite3.IntegrityError:
        pass
    else:
        raise AssertionError('A transação inválida deveria falhar')
    assert db.execute("SELECT count(*) FROM work_orders WHERE id='o'").fetchone()[0] == 1, 'Rollback obrigatório'
    assert db.execute("SELECT count(*) FROM order_events WHERE id='z'").fetchone()[0] == 1


def test_routes_and_snapshot_history():
    db = open_sqlite(legacy=True)
    db.execute("INSERT INTO routes(id,title,area,created_at) VALUES ('r','Lubrificação','Setor A','2026-10-20T12:00:00Z')")
    db.execute("""INSERT INTO route_points(id,route_id,asset_id,title,lubricant,quantity_grams,position)
        VALUES ('p','r','a','Mancal A','Graxa teste',3.5,0)""")
    db.execute("""INSERT INTO route_runs(id,route_id,route_title,started_at,finished_at)
        VALUES ('run','r','Lubrificação','2026-10-20T12:00:00Z',NULL)""")
    db.execute("""INSERT INTO route_run_items(id,run_id,point_id,point_title,asset_label,lubricant,quantity_grams,status,notes,recorded_at,position)
        VALUES ('item','run','p','Mancal A','M-01','Graxa teste',3.5,'pending','',NULL,0)""")
    db.execute("""UPDATE route_run_items SET status='anomaly',notes='Vazamento de graxa no mancal',recorded_at='2026-10-20T12:02:00Z'
        WHERE id='item'""")
    db.execute("UPDATE route_runs SET finished_at='2026-10-20T12:04:00Z' WHERE id='run'")
    db.execute("DELETE FROM routes WHERE id='r'")
    assert db.execute("SELECT COUNT(*) FROM route_points").fetchone()[0] == 0, 'Pontos novos removidos por cascata'
    assert db.execute("SELECT route_id FROM route_runs WHERE id='run'").fetchone()[0] is None, 'Histórico órfão preservado'
    assert db.execute("SELECT status,notes FROM route_run_items WHERE id='item'").fetchone() == (
        'anomaly','Vazamento de graxa no mancal')
    assert db.execute('PRAGMA foreign_key_check').fetchall() == []
    db.commit()
    try:
        with db:
            db.execute("DELETE FROM route_run_items")
            db.execute("""INSERT INTO route_run_items
                (id,run_id,point_id,point_title,asset_label,lubricant,quantity_grams,status,notes,recorded_at,position)
                VALUES('invalid','missing','x','Teste','', '',0,'pending','',NULL,0)""")
    except sqlite3.IntegrityError:
        pass
    else:
        raise AssertionError('Restore deve reverter FK inválida')
    assert db.execute("SELECT COUNT(*) FROM route_run_items WHERE id='item'").fetchone()[0] == 1



if __name__ == '__main__':
    test_fresh()
    test_legacy_upgrade()
    test_routes_and_snapshot_history()
    print('OK: rotas, histórico, migração, cascata, atualização e rollback SQLite')
