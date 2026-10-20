import * as SQLite from 'expo-sqlite';
import type {Asset, AssetDraft, BackupData, Execution, ExecutionPhoto, OrderDraft, PhotoDraft, WorkOrder} from './types';
import {deletePhotoFile, persistPhoto, MAX_PHOTOS_PER_EXECUTION} from './evidence';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
function database() {
  if (!databasePromise) databasePromise = SQLite.openDatabaseAsync('rotamanutencao.db');
  return databasePromise;
}

export function localDate(value = new Date()): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(year, month - 1, day, 12);
  next.setDate(next.getDate() + days);
  return localDate(next);
}

export function validDate(input: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return false;
  const [year, month, day] = input.split('-').map(Number);
  const dt = new Date(year, month - 1, day, 12);
  return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day;
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export async function initializeDatabase(): Promise<void> {
  const db = await database();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY NOT NULL,
      code TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      area TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS work_orders (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL,
      priority TEXT NOT NULL,
      asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
      recurrence_days INTEGER NOT NULL DEFAULT 0 CHECK (recurrence_days >= 0),
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS executions (
      id TEXT PRIMARY KEY NOT NULL,
      order_id TEXT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
      order_title TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      executed_at TEXT NOT NULL,
      previous_due_date TEXT NOT NULL,
      next_due_date TEXT
    );
    CREATE TABLE IF NOT EXISTS execution_photos (
      id TEXT PRIMARY KEY NOT NULL,
      execution_id TEXT NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
      filename TEXT NOT NULL UNIQUE,
      mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg','image/png')),
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_photos_execution ON execution_photos(execution_id);
    CREATE INDEX IF NOT EXISTS idx_orders_due ON work_orders(status, due_date);
    CREATE INDEX IF NOT EXISTS idx_executions_date ON executions(executed_at DESC);
  `);
  // Migração não destrutiva para quem já usava o MVP 0.1.
  const fields = await db.getAllAsync<{name: string}>("PRAGMA table_info(executions)");
  if (!fields.some(f => f.name === 'asset_label'))
    await db.execAsync("ALTER TABLE executions ADD COLUMN asset_label TEXT NOT NULL DEFAULT ''");
  if (!fields.some(f => f.name === 'category'))
    await db.execAsync("ALTER TABLE executions ADD COLUMN category TEXT NOT NULL DEFAULT ''");
}

export async function listAssets(): Promise<Asset[]> {
  return (await database()).getAllAsync<Asset>('SELECT * FROM assets ORDER BY area, name');
}

export async function listOrders(): Promise<WorkOrder[]> {
  return (await database()).getAllAsync<WorkOrder>(`
    SELECT o.*, a.name AS asset_name FROM work_orders o
    LEFT JOIN assets a ON a.id = o.asset_id
    ORDER BY CASE WHEN o.status = 'pending' THEN 0 ELSE 1 END,
             o.due_date ASC, o.created_at DESC
  `);
}

export async function listExecutions(): Promise<Execution[]> {
  return (await database()).getAllAsync<Execution>(
    `SELECT e.*, (SELECT COUNT(*) FROM execution_photos p WHERE p.execution_id=e.id) AS photo_count
     FROM executions e ORDER BY executed_at DESC LIMIT 500`
  );
}

export async function saveAsset(input: AssetDraft, existingId?: string): Promise<void> {
  const db = await database();
  const name = input.name.trim();
  if (!name) throw new Error('Informe o nome do equipamento.');
  if (name.length > 300 || input.code.length > 200 || input.area.length > 200)
    throw new Error('Um dos campos do equipamento é longo demais.');
  if (existingId) {
    await db.runAsync('UPDATE assets SET name=?, code=?, area=? WHERE id=?',
      name, input.code.trim(), input.area.trim(), existingId);
  } else {
    await db.runAsync('INSERT INTO assets (id, code, name, area, created_at) VALUES (?, ?, ?, ?, ?)',
      makeId(), input.code.trim(), name, input.area.trim(), new Date().toISOString());
  }
}

export async function saveOrder(input: OrderDraft, existingId?: string): Promise<void> {
  const db = await database();
  const title = input.title.trim();
  if (!title) throw new Error('Informe o título da atividade.');
  if (title.length > 300 || input.description.length > 10000)
    throw new Error('Título ou descrição excede o limite permitido.');
  if (!validDate(input.due_date)) throw new Error('Use a data no formato AAAA-MM-DD.');
  if (!Number.isInteger(input.recurrence_days) || input.recurrence_days < 0)
    throw new Error('A periodicidade precisa ser 0 ou um número inteiro de dias.');
  const now = new Date().toISOString();
  if (existingId) {
    await db.runAsync(`UPDATE work_orders SET title=?,description=?,category=?,priority=?,asset_id=?,
      recurrence_days=?,due_date=?,updated_at=? WHERE id=?`,
      title, input.description.trim(), input.category, input.priority,
      input.asset_id, input.recurrence_days, input.due_date, now, existingId);
  } else {
    await db.runAsync(`INSERT INTO work_orders
      (id,title,description,category,priority,asset_id,recurrence_days,due_date,status,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      makeId(), title, input.description.trim(), input.category, input.priority,
      input.asset_id, input.recurrence_days, input.due_date, 'pending', now, now);
  }
}

export async function listAllPhotos(): Promise<ExecutionPhoto[]> {
  return (await database()).getAllAsync<ExecutionPhoto>(
    'SELECT * FROM execution_photos ORDER BY created_at ASC'
  );
}

export async function completeOrder(order: WorkOrder, notes: string, photos: PhotoDraft[] = []): Promise<void> {
  if (order.status !== 'pending') throw new Error('Esta atividade já foi concluída.');
  if (photos.length > MAX_PHOTOS_PER_EXECUTION) throw new Error('Limite de 6 fotos por execução.');
  if (notes.length > 10000) throw new Error('Observação grande demais. Resuma o registro.');
  const db = await database();
  const nextDue = order.recurrence_days > 0
    ? addDays(localDate(), order.recurrence_days) : null;
  const now = new Date().toISOString();
  const executionId = makeId();
  const savedFiles: string[] = [];
  try {
    // Copiamos os anexos ANTES da transação, nunca em cache temporário.
    for (const photo of photos) savedFiles.push(await persistPhoto(photo));
    await db.withExclusiveTransactionAsync(async (tx) => {
      const changed = await tx.runAsync(`UPDATE work_orders SET status=?,due_date=?,updated_at=?
        WHERE id=? AND status='pending'`, nextDue ? 'pending' : 'completed',
        nextDue ?? order.due_date, now, order.id);
      if (changed.changes !== 1) throw new Error('Atividade alterada. Atualize a tela.');
      await tx.runAsync(`INSERT INTO executions
        (id,order_id,order_title,notes,executed_at,previous_due_date,next_due_date,asset_label,category)
        VALUES (?,?,?,?,?,?,?,?,?)`,
        executionId, order.id, order.title, notes.trim(), now, order.due_date, nextDue,
        order.asset_name ?? '', order.category);
      for (let i = 0; i < savedFiles.length; i++) {
        const mime = photos[i].mime_type;
        await tx.runAsync(`INSERT INTO execution_photos
          (id,execution_id,filename,mime_type,created_at) VALUES (?,?,?,?,?)`,
          makeId(), executionId, savedFiles[i], mime, now);
      }
    });
  } catch (error) {
    await Promise.allSettled(savedFiles.map(deletePhotoFile));
    throw error;
  }
}

export async function exportDatabaseRows(): Promise<Omit<BackupData, 'format' | 'version' | 'exported_at' | 'photos'> & {photos: ExecutionPhoto[]}> {
  const db = await database();
  // A exportação usa todo o histórico, não apenas as 500 execuções da tela.
  const [assets, work_orders, executions, photos] = await Promise.all([
    db.getAllAsync<Asset>('SELECT * FROM assets'),
    db.getAllAsync<Omit<WorkOrder, 'asset_name'>>('SELECT * FROM work_orders'),
    db.getAllAsync<Omit<Execution, 'photo_count'>>('SELECT * FROM executions'),
    db.getAllAsync<ExecutionPhoto>('SELECT * FROM execution_photos'),
  ]);
  return {assets, work_orders, executions, photos};
}

// Os dados são validados pelo módulo de backup antes de chegar à transação.
export async function restoreDatabaseRows(data: BackupData, filenames: Map<string, string>): Promise<void> {
  const db = await database();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync('DELETE FROM work_orders'); // CASCADE -> execuções e fotos
    await tx.runAsync('DELETE FROM assets');
    for (const a of data.assets) {
      await tx.runAsync('INSERT INTO assets (id,code,name,area,created_at) VALUES (?,?,?,?,?)',
        a.id, a.code, a.name, a.area, a.created_at);
    }
    for (const o of data.work_orders) {
      await tx.runAsync(`INSERT INTO work_orders
        (id,title,description,category,priority,asset_id,recurrence_days,due_date,status,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`, o.id,o.title,o.description,o.category,o.priority,o.asset_id,
        o.recurrence_days,o.due_date,o.status,o.created_at,o.updated_at);
    }
    for (const e of data.executions) {
      await tx.runAsync(`INSERT INTO executions
        (id,order_id,order_title,notes,executed_at,previous_due_date,next_due_date,asset_label,category)
        VALUES (?,?,?,?,?,?,?,?,?)`, e.id,e.order_id,e.order_title,e.notes,e.executed_at,
        e.previous_due_date,e.next_due_date,e.asset_label,e.category);
    }
    for (const p of data.photos) {
      const filename = filenames.get(p.id);
      if (!filename) throw new Error('Foto ausente no backup.');
      await tx.runAsync('INSERT INTO execution_photos (id,execution_id,filename,mime_type,created_at) VALUES (?,?,?,?,?)',
        p.id, p.execution_id, filename, p.mime_type, p.created_at);
    }
  });
}

export async function removeOrder(orderId: string): Promise<void> {
  // Excluir uma atividade também exclui seu histórico; a interface informa essa consequência.
  const db = await database();
  const files = await db.getAllAsync<{filename: string}>(`SELECT p.filename FROM execution_photos p
    JOIN executions e ON p.execution_id=e.id WHERE e.order_id=?`, orderId);
  await db.runAsync('DELETE FROM work_orders WHERE id=?', orderId);
  // Limpar arquivos depois do commit; falhas de limpeza não comprometem o histórico remanescente.
  await Promise.allSettled(files.map(f => deletePhotoFile(f.filename)));
}

export async function removeAsset(assetId: string): Promise<void> {
  // Ordens permanecem disponíveis, porém sem vínculo com o equipamento excluído.
  await (await database()).runAsync('DELETE FROM assets WHERE id=?', assetId);
}
