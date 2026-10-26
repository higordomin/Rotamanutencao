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


def open_sqlite(legacy=False, legacy_routes=False, legacy_history=False, legacy_route_items=False):
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
        if legacy_history:
            conn.execute("""INSERT INTO executions(id,order_id,order_title,notes,executed_at,
                previous_due_date,next_due_date,asset_label,category)
                VALUES('legacy-e','o','Lubrificação','OS executada','2026-10-20T12:01:00Z',
                '2026-10-20','2026-11-19','M-01 · Motor 01 · Produção','Lubrificação')""")
        conn.commit()
    if legacy_routes:
        conn.executescript("""
        CREATE TABLE routes(id TEXT PRIMARY KEY NOT NULL,title TEXT NOT NULL,
          area TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL);
        INSERT INTO routes(id,title,area,created_at)
          VALUES('old-route','Lubrificação preventiva','Setor A','2026-10-20T12:00:00Z');
        """)
    if legacy_route_items:
        # Simula banco 0.17 em que o checklist não tinha a coluna asset_id.
        conn.executescript("""
        CREATE TABLE route_runs(
          id TEXT PRIMARY KEY,route_id TEXT,route_title TEXT,
          started_at TEXT,finished_at TEXT
        );
        INSERT INTO route_runs VALUES('legacy-run',NULL,'Rota antiga','2026-10-20T12:00:00Z',NULL);
        CREATE TABLE route_run_items(
          id TEXT PRIMARY KEY,run_id TEXT REFERENCES route_runs(id) ON DELETE CASCADE,
          point_id TEXT,point_title TEXT,asset_label TEXT,lubricant TEXT,
          quantity_grams REAL,status TEXT,notes TEXT,recorded_at TEXT,position INTEGER
        );
        INSERT INTO route_run_items VALUES('legacy-point','legacy-run','old-point','Mancal A',
          'M-01 · Motor 01 · Produção','Graxa',2,'done','',
          '2026-10-20T12:01:00Z',0);
        """)
    conn.executescript(schema)
    route_fields=[row[1] for row in conn.execute('PRAGMA table_info(routes)')]
    route_migrations=[
        ('recurrence_days',"ALTER TABLE routes ADD COLUMN recurrence_days INTEGER NOT NULL DEFAULT 0 CHECK(recurrence_days >= 0 AND recurrence_days <= 36500)"),
        ('next_due_date',"ALTER TABLE routes ADD COLUMN next_due_date TEXT"),
        ('attention_count',"ALTER TABLE routes ADD COLUMN attention_count INTEGER NOT NULL DEFAULT 0 CHECK(attention_count >= 0)"),
        ('attention_at',"ALTER TABLE routes ADD COLUMN attention_at TEXT")
    ]
    for name,statement in route_migrations:
        if name not in route_fields:
            conn.execute(statement)
    for name in ['block_reason', 'blocked_at', 'partial_reason', 'partial_at','archived_at','archive_reason']:
        existing = [row[1] for row in conn.execute('PRAGMA table_info(work_orders)')]
        if name not in existing:
            if name == 'block_reason':
                conn.execute("ALTER TABLE work_orders ADD COLUMN block_reason TEXT NOT NULL DEFAULT ''")
            elif name == 'blocked_at':
                conn.execute('ALTER TABLE work_orders ADD COLUMN blocked_at TEXT')
            elif name == 'partial_reason':
                conn.execute("ALTER TABLE work_orders ADD COLUMN partial_reason TEXT NOT NULL DEFAULT ''")
            elif name == 'partial_at':
                conn.execute('ALTER TABLE work_orders ADD COLUMN partial_at TEXT')
            elif name == 'archived_at':
                conn.execute('ALTER TABLE work_orders ADD COLUMN archived_at TEXT')
            else:
                conn.execute("ALTER TABLE work_orders ADD COLUMN archive_reason TEXT NOT NULL DEFAULT ''")
    fields = [row[1] for row in conn.execute('PRAGMA table_info(executions)')]
    # O schema inicial é legado: espelhar também migração de snapshots/área usada no app.
    if 'asset_label' not in fields:
        conn.execute("ALTER TABLE executions ADD COLUMN asset_label TEXT NOT NULL DEFAULT ''")
    if 'category' not in fields:
        conn.execute("ALTER TABLE executions ADD COLUMN category TEXT NOT NULL DEFAULT ''")
    if 'result' not in fields:
        conn.execute("ALTER TABLE executions ADD COLUMN result TEXT NOT NULL DEFAULT 'completed' CHECK(result IN ('completed','partial'))")
    if 'asset_id' not in fields:
        conn.execute("ALTER TABLE executions ADD COLUMN asset_id TEXT")
        # Replica backfill: somente snapshot igual e único no cadastro, sem alterar fotos.
        snapshots={}
        for asset_id,code,name,area in conn.execute('SELECT id,code,name,area FROM assets'):
            label=' · '.join(part for part in (code,name,area) if part)[:300]
            snapshots[label]=None if label in snapshots else asset_id
        for execution_id, label in conn.execute("SELECT id,asset_label FROM executions WHERE asset_id IS NULL AND asset_label != ''").fetchall():
            matched=snapshots.get(label)
            if matched is not None:
                conn.execute('UPDATE executions SET asset_id=? WHERE id=?',(matched,execution_id))
    conn.execute('CREATE INDEX IF NOT EXISTS idx_executions_asset_id ON executions(asset_id,executed_at DESC)')
    route_item_fields=[row[1] for row in conn.execute('PRAGMA table_info(route_run_items)')]
    if 'asset_id' not in route_item_fields:
        conn.execute('ALTER TABLE route_run_items ADD COLUMN asset_id TEXT')
        matches={}
        for asset_id,code,name,area in conn.execute('SELECT id,code,name,area FROM assets'):
            label=' · '.join(part for part in (code,name,area) if part)[:300]
            matches[label]=None if label in matches else asset_id
        for item_id,label in conn.execute(
                "SELECT id,asset_label FROM route_run_items WHERE asset_id IS NULL AND asset_label!=''").fetchall():
            safe_id=matches.get(label)
            if safe_id is not None:
                conn.execute('UPDATE route_run_items SET asset_id=? WHERE id=?',(safe_id,item_id))
    conn.execute('CREATE INDEX IF NOT EXISTS idx_route_run_items_asset ON route_run_items(asset_id,run_id)')
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
    db.execute("""INSERT INTO route_run_photos(id,item_id,filename,mime_type,created_at)
        VALUES ('photo-route','item','route_1.jpg','image/jpeg','2026-10-20T12:03:00Z')""")
    assert db.execute("SELECT COUNT(*) FROM route_run_photos WHERE item_id='item'").fetchone()[0] == 1
    db.execute("DELETE FROM routes WHERE id='r'")
    assert db.execute("SELECT COUNT(*) FROM route_points").fetchone()[0] == 0, 'Pontos novos removidos por cascata'
    assert db.execute("SELECT COUNT(*) FROM route_run_photos WHERE id='photo-route'").fetchone()[0] == 1, 'Foto deve sobreviver à exclusão do cadastro'
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
    assert db.execute("SELECT COUNT(*) FROM route_run_photos WHERE id='photo-route'").fetchone()[0] == 1



def test_old_route_migration_and_schedule():
    db=open_sqlite(legacy=True,legacy_routes=True)
    before=db.execute("SELECT id,title,area FROM routes WHERE id='old-route'").fetchone()
    assert before==('old-route','Lubrificação preventiva','Setor A')
    assert db.execute("SELECT recurrence_days,next_due_date,attention_count,attention_at FROM routes WHERE id='old-route'").fetchone()==(0,None,0,None)
    db.execute("UPDATE routes SET recurrence_days=30,next_due_date='2026-10-21' WHERE id='old-route'")
    db.execute("UPDATE routes SET attention_count=2,attention_at='2026-10-21T00:00:00Z' WHERE id='old-route'")
    assert db.execute("SELECT next_due_date,attention_count FROM routes WHERE id='old-route'").fetchone()==('2026-10-21',2)
    db.execute("UPDATE routes SET next_due_date='2026-11-20',attention_count=0,attention_at=NULL WHERE id='old-route'")
    assert db.execute("SELECT next_due_date,attention_count FROM routes WHERE id='old-route'").fetchone()==('2026-11-20',0)
    assert db.execute('PRAGMA foreign_key_check').fetchall()==[]



def test_reminder_settings_migrate_without_dropping_data():
    db=open_sqlite(legacy=True,legacy_routes=True)
    tables={row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert 'app_settings' in tables
    db.execute("INSERT INTO app_settings(key,value) VALUES('reminders.enabled','1')")
    db.execute("INSERT INTO app_settings(key,value) VALUES('reminders.hour','14')")
    db.execute("UPDATE app_settings SET value='19' WHERE key='reminders.hour'")
    assert db.execute("SELECT value FROM app_settings WHERE key='reminders.hour'").fetchone()[0]=='19'
    assert db.execute("SELECT COUNT(*) FROM work_orders").fetchone()[0]==1, 'Migração não pode apagar OS'
    assert db.execute("SELECT COUNT(*) FROM routes WHERE id='old-route'").fetchone()[0]==1
    assert db.execute("PRAGMA foreign_key_check").fetchall()==[]



def test_soft_archive_preserves_execution_photos_and_can_restore():
    db=open_sqlite(legacy=True)
    assert db.execute("SELECT archived_at,archive_reason FROM work_orders WHERE id='o'").fetchone()==(None,'')
    db.execute("""INSERT INTO executions(id,order_id,order_title,notes,executed_at,previous_due_date,
        next_due_date,asset_label,category,result)
        VALUES('hist','o','Lubrificação','Serviço realizado','2026-10-21T11:00:00Z','2026-10-20',
        '2026-11-19','M-01','Lubrificação','completed')""")
    db.execute("""INSERT INTO execution_photos(id,execution_id,filename,mime_type,created_at)
        VALUES('pic','hist','pic_archive.jpg','image/jpeg','2026-10-21T11:00:00Z')""")
    db.execute("""UPDATE work_orders SET archived_at='2026-10-21T12:00:00Z',
        archive_reason='Equipamento temporariamente inativo' WHERE id='o'""")
    assert db.execute("SELECT COUNT(*) FROM work_orders WHERE archived_at IS NULL").fetchone()[0]==0
    assert db.execute("SELECT COUNT(*) FROM work_orders WHERE archived_at IS NOT NULL").fetchone()[0]==1
    assert db.execute("SELECT COUNT(*) FROM executions WHERE order_id='o'").fetchone()[0]==1
    assert db.execute("SELECT COUNT(*) FROM execution_photos WHERE id='pic'").fetchone()[0]==1
    assert db.execute("PRAGMA quick_check").fetchone()[0]=='ok'
    assert db.execute("PRAGMA foreign_key_check").fetchall()==[]
    db.execute("UPDATE work_orders SET archived_at=NULL,archive_reason='' WHERE id='o'")
    assert db.execute("SELECT COUNT(*) FROM work_orders WHERE archived_at IS NULL").fetchone()[0]==1
    assert db.execute("SELECT COUNT(*) FROM executions WHERE order_id='o'").fetchone()[0]==1


def test_archived_orders_restore_snapshot_transaction():
    db=open_sqlite(legacy=True)
    db.execute("""UPDATE work_orders SET archived_at='2026-10-21T12:00:00Z',
        archive_reason='Plano substituído por nova rotina' WHERE id='o'""")
    db.commit()
    try:
        with db:
            db.execute("DELETE FROM work_orders")
            db.execute("INSERT INTO work_orders(id,title,status) VALUES('bad','X','not-a-state')")
    except sqlite3.IntegrityError:
        pass
    else:
        raise AssertionError('Backup inválido deveria dar rollback')
    assert db.execute("SELECT archived_at FROM work_orders WHERE id='o'").fetchone()[0]=='2026-10-21T12:00:00Z'


def test_asset_id_keeps_identity_after_rename_and_deletion():
    db=open_sqlite()
    db.execute("INSERT INTO assets VALUES('id-ativo','T-11','Esteira','Fábrica','2026-10-21T10:00:00Z')")
    db.execute("""INSERT INTO work_orders(id,title,description,category,priority,asset_id,
        recurrence_days,due_date,status,created_at,updated_at)
        VALUES('order1','Lubrificar','','Lubrificação','Alta','id-ativo',30,'2026-10-21','pending',
        '2026-10-21T10:00:00Z','2026-10-21T10:00:00Z')""")
    db.execute("""INSERT INTO executions(id,order_id,order_title,notes,executed_at,
        previous_due_date,next_due_date,asset_label,category,result,asset_id)
        VALUES('exec1','order1','Lubrificar','Feito','2026-10-21T11:00:00Z',
        '2026-10-21','2026-11-20','T-11 · Esteira · Fábrica','Lubrificação','completed','id-ativo')""")
    db.execute("""INSERT INTO execution_photos(id,execution_id,filename,mime_type,created_at)
        VALUES('photo','exec1','photo.jpg','image/jpeg','2026-10-21T11:00:00Z')""")
    db.execute("UPDATE assets SET code='TAG-NOVA',name='Esteira revisada',area='Outra área' WHERE id='id-ativo'")
    assert db.execute("SELECT asset_id,asset_label FROM executions WHERE id='exec1'").fetchone() == (
        'id-ativo','T-11 · Esteira · Fábrica')
    db.execute("DELETE FROM assets WHERE id='id-ativo'")
    assert db.execute("SELECT asset_id FROM work_orders WHERE id='order1'").fetchone() == (None,)
    assert db.execute("SELECT asset_id FROM executions WHERE id='exec1'").fetchone() == ('id-ativo',)
    assert db.execute("SELECT COUNT(*) FROM execution_photos").fetchone()[0] == 1
    assert db.execute('PRAGMA foreign_key_check').fetchall() == []

def test_migration_preserves_unique_legacy_asset_link():
    db=open_sqlite(legacy=True,legacy_history=True)
    assert db.execute("SELECT asset_id FROM executions WHERE id='legacy-e'").fetchone() == ('a',)
    assert db.execute("SELECT count(*) FROM executions").fetchone()[0] == 1
    db.execute("UPDATE assets SET name='Motor renomeado' WHERE id='a'")
    assert db.execute("SELECT asset_id FROM executions WHERE id='legacy-e'").fetchone() == ('a',)
    assert db.execute('PRAGMA quick_check').fetchone()[0] == 'ok'


def test_route_history_identity_and_photos_survive_changes():
    db=open_sqlite(legacy=True,legacy_route_items=True)
    assert db.execute("SELECT asset_id FROM route_run_items WHERE id='legacy-point'").fetchone()==('a',)
    db.execute("""INSERT INTO route_run_photos(id,item_id,filename,mime_type,created_at)
        VALUES('old-photo','legacy-point','old_photo.jpg','image/jpeg','2026-10-20T12:01:00Z')""")
    db.execute("UPDATE assets SET code='TAG-NOVA',name='Novo motor',area='Nova linha' WHERE id='a'")
    assert db.execute("SELECT asset_id FROM route_run_items WHERE id='legacy-point'").fetchone()==('a',)
    db.execute("DELETE FROM assets WHERE id='a'")
    assert db.execute("SELECT asset_id FROM route_run_items WHERE id='legacy-point'").fetchone()==('a',)
    assert db.execute("SELECT filename FROM route_run_photos WHERE id='old-photo'").fetchone()==('old_photo.jpg',)
    assert db.execute('PRAGMA foreign_key_check').fetchall()==[]
    assert db.execute('PRAGMA quick_check').fetchone()[0]=='ok'
    query="""SELECT i.id,r.route_title,
        (SELECT COUNT(*) FROM route_run_photos p WHERE p.item_id=i.id) AS photo_count
        FROM route_run_items i JOIN route_runs r ON r.id=i.run_id
        WHERE i.asset_id=? ORDER BY r.started_at DESC LIMIT 300"""
    assert db.execute(query,('a',)).fetchone()==('legacy-point','Rota antiga',1)



def test_quick_route_action_is_atomic_and_preserves_other_points():
    db=open_sqlite(legacy=True)
    db.execute("""INSERT INTO routes(id,title,area,created_at)
        VALUES('r-fast','Inspeção de campo','Produção','2026-10-22T09:00:00Z')""")
    db.execute("""INSERT INTO route_runs(id,route_id,route_title,started_at,finished_at)
        VALUES('run-fast','r-fast','Inspeção de campo','2026-10-22T09:01:00Z',NULL)""")
    db.execute("""INSERT INTO route_run_items(id,run_id,point_id,point_title,asset_label,lubricant,
        quantity_grams,status,notes,recorded_at,position,asset_id)
        VALUES('fast-item','run-fast','point1','Mancal A','TAG · Equipamento','Graxa HD2T',
        3.5,'pending','',NULL,0,'a')""")
    db.execute("""INSERT INTO route_run_items(id,run_id,point_id,point_title,asset_label,lubricant,
        quantity_grams,status,notes,recorded_at,position,asset_id)
        VALUES('other-item','run-fast','point2','Mancal B','TAG · Equipamento','Graxa HD2T',
        5,'pending','',NULL,1,'a')""")
    statement="""UPDATE route_run_items SET status=?,notes=?,quantity_grams=0,recorded_at=?
        WHERE id=? AND status='pending' AND recorded_at IS NULL AND EXISTS (
        SELECT 1 FROM route_runs r WHERE r.id=route_run_items.run_id AND r.finished_at IS NULL)"""
    cur=db.execute(statement,('done','','2026-10-22T09:04:00Z','fast-item'))
    assert cur.rowcount==1
    assert db.execute("""SELECT status,notes,lubricant,quantity_grams,recorded_at
        FROM route_run_items WHERE id='fast-item'""").fetchone()==(
        'done','','Graxa HD2T',0,'2026-10-22T09:04:00Z')
    assert db.execute("SELECT status,quantity_grams FROM route_run_items WHERE id='other-item'").fetchone()==('pending',5)
    assert db.execute(statement,('done','','2026-10-22T09:05:00Z','fast-item')).rowcount==0
    assert db.execute(statement,('done','','2026-10-22T09:05:00Z','unknown-item')).rowcount==0
    db.execute("UPDATE route_runs SET finished_at='2026-10-22T09:06:00Z' WHERE id='run-fast'")
    assert db.execute(statement,('done','','2026-10-22T09:07:00Z','other-item')).rowcount==0
    assert db.execute("SELECT status FROM route_run_items WHERE id='other-item'").fetchone()==('pending',)
    assert db.execute('PRAGMA quick_check').fetchone()[0]=='ok'
    assert db.execute('PRAGMA foreign_key_check').fetchall()==[]


def test_reprogramming_is_blocked_during_open_run_and_preserves_attention():
    db=open_sqlite(legacy=True)
    db.execute("""INSERT INTO routes(id,title,area,created_at,recurrence_days,next_due_date,
        attention_count,attention_at) VALUES('route-schedule','Rota mensal','Linha 1',
        '2026-10-01T09:00:00Z',30,'2026-10-10',2,'2026-10-10T10:00:00Z')""")
    db.execute("""INSERT INTO route_runs(id,route_id,route_title,started_at,finished_at)
        VALUES('open-schedule','route-schedule','Rota mensal','2026-10-11T09:00:00Z',NULL)""")
    statement="""SELECT id FROM route_runs WHERE route_id=? AND finished_at IS NULL LIMIT 1"""
    assert db.execute(statement,('route-schedule',)).fetchone()==('open-schedule',)
    assert db.execute("""SELECT recurrence_days,next_due_date,attention_count FROM routes
        WHERE id='route-schedule'""").fetchone()==(30,'2026-10-10',2)
    db.execute("""UPDATE route_runs SET finished_at='2026-10-22T10:00:00Z'
        WHERE id='open-schedule'""")
    assert db.execute(statement,('route-schedule',)).fetchone() is None
    db.execute("""UPDATE routes SET recurrence_days=?,next_due_date=? WHERE id=?""",
        (15,'2026-11-01','route-schedule'))
    assert db.execute("""SELECT recurrence_days,next_due_date,attention_count,attention_at
        FROM routes WHERE id='route-schedule'""").fetchone()==(
        15,'2026-11-01',2,'2026-10-10T10:00:00Z')
    assert db.execute("SELECT finished_at FROM route_runs WHERE id='open-schedule'").fetchone()==(
        '2026-10-22T10:00:00Z',)
    assert db.execute('PRAGMA quick_check').fetchone()[0]=='ok'
    assert db.execute('PRAGMA foreign_key_check').fetchall()==[]



def test_route_edit_reorder_and_duplicate_preserve_history():
    db=open_sqlite()
    db.execute("""INSERT INTO assets(id,code,name,area,created_at) VALUES
      ('motor-A','M-10','Motor A','Linha 1','2026-10-22'),
      ('motor-B','M-20','Motor B','Linha 1','2026-10-22')""")
    db.execute("""INSERT INTO routes
      (id,title,area,created_at,recurrence_days,next_due_date,attention_count,attention_at)
      VALUES('route-A','Inspeção','Linha 1','2026-10-22',30,'2026-10-24',1,'2026-10-21')""")
    for key,title,position in [('p-1','Motor',10),('p-2','Proteção',20),('p-3','Sensores',30)]:
        db.execute("""INSERT INTO route_points
          (id,route_id,asset_id,title,lubricant,quantity_grams,position)
          VALUES(?,'route-A','motor-A',?,'',0,?)""",(key,title,position))
    db.execute("""INSERT INTO route_runs(id,route_id,route_title,started_at,finished_at)
      VALUES('history-A','route-A','Inspeção','2026-10-20','2026-10-21')""")
    db.execute("""INSERT INTO route_run_items
      (id,run_id,point_id,point_title,asset_label,lubricant,quantity_grams,status,notes,
       recorded_at,position,asset_id)
      VALUES('h-1','history-A','p-1','Motor','M-10','',0,'done','Sem falhas',
       '2026-10-21',0,'motor-A')""")
    db.execute("""INSERT INTO route_run_photos(id,item_id,filename,mime_type,created_at)
      VALUES('photo-A','h-1','photo-A.jpg','image/jpeg','2026-10-21')""")
    # Editar o checklist nunca atualiza snapshots de execuções anteriores.
    db.execute("UPDATE route_points SET title=?,asset_id=? WHERE id=? AND route_id=?",
      ('Checar proteção','motor-B','p-2','route-A'))
    for i,point_id in enumerate(['p-3','p-1','p-2']):
        db.execute("UPDATE route_points SET position=? WHERE id=? AND route_id=?",
          (i,point_id,'route-A'))
    assert db.execute("""SELECT id FROM route_points WHERE route_id='route-A'
      ORDER BY position,id""").fetchall()==[('p-3',),('p-1',),('p-2',)]
    assert db.execute("SELECT title,asset_id FROM route_points WHERE id='p-2'").fetchone()==(
      'Checar proteção','motor-B')
    # Nova rota é um modelo: sem horário, alerta ou histórico copiado.
    db.execute("""INSERT INTO routes
      (id,title,area,created_at,recurrence_days,next_due_date,attention_count,attention_at)
      VALUES('copy-A','Cópia de Inspeção','Linha 1','2026-10-22',0,NULL,0,NULL)""")
    points=db.execute("""SELECT asset_id,title FROM route_points WHERE route_id='route-A'
      ORDER BY position,id""").fetchall()
    for i,(asset_id,title) in enumerate(points):
        db.execute("""INSERT INTO route_points
          (id,route_id,asset_id,title,lubricant,quantity_grams,position)
          VALUES(?,?,?,?,?,?,?)""",(f'copy-{i}','copy-A',asset_id,title,'',0,i))
    assert db.execute("""SELECT recurrence_days,next_due_date,attention_count,attention_at
      FROM routes WHERE id='copy-A'""").fetchone()==(0,None,0,None)
    assert db.execute("SELECT COUNT(*) FROM route_runs WHERE route_id='copy-A'").fetchone()==(0,)
    assert db.execute("SELECT COUNT(*) FROM route_points WHERE route_id='copy-A'").fetchone()==(3,)
    assert db.execute("SELECT point_title,notes FROM route_run_items WHERE id='h-1'").fetchone()==(
      'Motor','Sem falhas')
    assert db.execute("SELECT COUNT(*) FROM route_run_photos WHERE id='photo-A'").fetchone()==(1,)
    db.execute("""INSERT INTO route_runs(id,route_id,route_title,started_at,finished_at)
      VALUES('running-A','route-A','Inspeção','2026-10-22',NULL)""")
    assert db.execute("""SELECT id FROM route_runs WHERE route_id='route-A'
      AND finished_at IS NULL LIMIT 1""").fetchone()==('running-A',)
    assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
    assert db.execute('PRAGMA foreign_key_check').fetchall()==[]





def test_corrective_order_link_is_unique_and_survives_status_updates():
    db=open_sqlite()
    db.execute("""INSERT INTO assets(id,code,name,area,created_at)
      VALUES('a-C','TAG-10','Redutor','Linha 1','2026-10-22')""")
    db.execute("""INSERT INTO routes(id,title,area,created_at,recurrence_days,next_due_date)
      VALUES('r-C','Inspeção','Linha 1','2026-10-22',7,'2026-10-24')""")
    db.execute("""INSERT INTO route_runs(id,route_id,route_title,started_at,finished_at)
      VALUES('run-C','r-C','Inspeção','2026-10-22',NULL)""")
    db.execute("""INSERT INTO route_run_items
      (id,run_id,point_id,point_title,asset_label,asset_id,lubricant,quantity_grams,status,
       notes,recorded_at,position)
      VALUES('item-C','run-C','p-C','Verificar redutor','TAG-10 · Redutor','a-C','',0,
       'anomaly','Vazamento no redutor da linha','2026-10-22T12:00:00Z',0)""")
    db.execute("""INSERT INTO work_orders
      (id,title,description,category,priority,asset_id,recurrence_days,due_date,status,
       created_at,updated_at)
      VALUES('os-C','Corrigir vazamento','Origem: rota Inspeção','Mecânica','Alta','a-C',
       0,'2026-10-22','pending','2026-10-22T12:01:00Z','2026-10-22T12:01:00Z')""")
    db.execute("""INSERT INTO route_corrective_links(item_id,order_id,created_at)
      VALUES('item-C','os-C','2026-10-22T12:01:00Z')""")
    row=db.execute("""SELECT i.asset_id,o.asset_id,o.status FROM route_corrective_links l
      JOIN route_run_items i ON i.id=l.item_id JOIN work_orders o ON o.id=l.order_id
      WHERE l.item_id='item-C'""").fetchone()
    assert row==('a-C','a-C','pending')
    try:
        db.execute("""INSERT INTO route_corrective_links(item_id,order_id,created_at)
          VALUES('item-C','os-C','2026-10-22T12:02:00Z')""")
        assert False,'Aceitou OS duplicada'
    except sqlite3.IntegrityError:
        pass
    db.execute("UPDATE work_orders SET status='completed' WHERE id='os-C'")
    assert db.execute("""SELECT o.status FROM route_corrective_links l
      JOIN work_orders o ON o.id=l.order_id WHERE l.item_id='item-C'""").fetchone()==('completed',)
    assert db.execute("SELECT status,notes FROM route_run_items WHERE id='item-C'").fetchone()==(
        'anomaly','Vazamento no redutor da linha')
    db.execute("DELETE FROM route_corrective_links")
    assert db.execute("SELECT COUNT(*) FROM work_orders WHERE id='os-C'").fetchone()==(1,)
    assert db.execute('PRAGMA quick_check').fetchone()[0]=='ok'
    assert db.execute('PRAGMA foreign_key_check').fetchall()==[]


def test_weekly_productivity_is_sqlite_snapshot_and_not_a_percentage():
    """Usa a consulta SQL real de 0.28: históricos parciais não são conclusões."""
    db=open_sqlite()
    db.execute("""INSERT INTO work_orders
      (id,title,description,category,priority,asset_id,recurrence_days,due_date,status,
       created_at,updated_at)
      VALUES('ord-p','Inspecionar painel','','Elétrica','Média',NULL,7,'2026-10-26','pending',
             '2026-10-20T00:00:00Z','2026-10-20T00:00:00Z')""")
    for record_id,status,at in (
       ('done-current','completed','2026-10-26T12:00:00Z'),
       ('partial-current','partial','2026-10-22T09:00:00Z'),
       ('done-outside','completed','2026-10-18T12:00:00Z')
    ):
        db.execute("""INSERT INTO executions
          (id,order_id,order_title,notes,executed_at,previous_due_date,
           next_due_date,asset_label,category,result)
          VALUES(?, 'ord-p','Inspecionar painel','',?,'2026-10-26',NULL,'Q-1','Elétrica',?)""",
          (record_id,at,status))
    for run_id,finished in (
      ('finished-current','2026-10-24T11:00:00Z'),
      ('finished-outside','2026-10-18T11:00:00Z'),
      ('running',None)
    ):
        db.execute("""INSERT INTO route_runs
          (id,route_id,route_title,started_at,finished_at)
          VALUES(?,NULL,'Rota elétrica','2026-10-18T10:00:00Z',?)""",
          (run_id,finished))
    script=(SRC.parent/'weeklyProductivity.ts').read_text(encoding='utf8')
    pattern=r'const counts=await db.getFirstAsync<.*?>\\(\\`([\\s\\S]*?)\\`,start,today'
    # Regex robusto com quebras de linha para extrair a consulta TypeScript real.
    match=re.search(r'const counts=await db\\.getFirstAsync<[^>]+>\\(\\`([\\s\\S]*?)\\`,start,today',script)
    assert match,'Consulta semanal não encontrada no fonte'
    query=match.group(1)
    assert query.count('?')==6
    start,end='2026-10-20','2026-10-26'
    before=db.execute('SELECT COUNT(*) FROM executions').fetchone()[0]
    result=db.execute(query,(start,end,start,end,start,end)).fetchone()
    assert result==(1,1,1),result
    assert db.execute('SELECT COUNT(*) FROM executions').fetchone()[0]==before
    assert db.execute('PRAGMA foreign_key_check').fetchall()==[]




if __name__ == '__main__':
    test_fresh()
    test_legacy_upgrade()
    test_routes_and_snapshot_history()
    test_old_route_migration_and_schedule()
    test_reminder_settings_migrate_without_dropping_data()
    test_soft_archive_preserves_execution_photos_and_can_restore()
    test_archived_orders_restore_snapshot_transaction()
    test_asset_id_keeps_identity_after_rename_and_deletion()
    test_migration_preserves_unique_legacy_asset_link()
    test_route_history_identity_and_photos_survive_changes()
    test_quick_route_action_is_atomic_and_preserves_other_points()
    test_reprogramming_is_blocked_during_open_run_and_preserves_attention()
    test_route_edit_reorder_and_duplicate_preserve_history()
    test_corrective_order_link_is_unique_and_survives_status_updates()
    test_weekly_productivity_is_sqlite_snapshot_and_not_a_percentage()
    print('OK: preferência notificações locais, rotas, OS, migração, cascata e rollback SQLite')
