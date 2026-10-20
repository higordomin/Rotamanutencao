import * as SQLite from 'expo-sqlite';
import type {Asset, AssetDraft, Execution, OrderDraft, WorkOrder} from './types';

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
    CREATE INDEX IF NOT EXISTS idx_orders_due ON work_orders(status, due_date);
    CREATE INDEX IF NOT EXISTS idx_executions_date ON executions(executed_at DESC);
  `);
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
    'SELECT * FROM executions ORDER BY executed_at DESC LIMIT 500'
  );
}

export async function saveAsset(input: AssetDraft, existingId?: string): Promise<void> {
  const db = await database();
  const name = input.name.trim();
  if (!name) throw new Error('Informe o nome do equipamento.');
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

export async function completeOrder(order: WorkOrder, notes: string): Promise<void> {
  if (order.status !== 'pending') throw new Error('Esta atividade já foi concluída.');
  const db = await database();
  const nextDue = order.recurrence_days > 0
    ? addDays(localDate(), order.recurrence_days) : null;
  const now = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async (tx) => {
    const changed = await tx.runAsync(`UPDATE work_orders SET status=?,due_date=?,updated_at=?
      WHERE id=? AND status='pending'`, nextDue ? 'pending' : 'completed',
      nextDue ?? order.due_date, now, order.id);
    if (changed.changes !== 1) throw new Error('Atividade alterada por outro processo. Atualize a tela.');
    await tx.runAsync(`INSERT INTO executions
      (id,order_id,order_title,notes,executed_at,previous_due_date,next_due_date)
      VALUES (?,?,?,?,?,?,?)`,
      makeId(), order.id, order.title, notes.trim(), now, order.due_date, nextDue);
  });
}

export async function removeOrder(orderId: string): Promise<void> {
  // Excluir uma atividade também exclui seu histórico; a interface informa essa consequência.
  await (await database()).runAsync('DELETE FROM work_orders WHERE id=?', orderId);
}

export async function removeAsset(assetId: string): Promise<void> {
  // Ordens permanecem disponíveis, porém sem vínculo com o equipamento excluído.
  await (await database()).runAsync('DELETE FROM assets WHERE id=?', assetId);
}
