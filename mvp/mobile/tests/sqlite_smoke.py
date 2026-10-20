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
    for name in ['block_reason', 'blocked_at']:
        existing = [row[1] for row in conn.execute('PRAGMA table_info(work_orders)')]
        if name not in existing:
            if name == 'block_reason':
                conn.execute("ALTER TABLE work_orders ADD COLUMN block_reason TEXT NOT NULL DEFAULT ''")
            else:
                conn.execute('ALTER TABLE work_orders ADD COLUMN blocked_at TEXT')
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


if __name__ == '__main__':
    test_fresh()
    test_legacy_upgrade()
    print('OK: schema novo; impedimento/liberação; cascade; upgrade v0.2; rollback')
