import * as SQLite from 'expo-sqlite';
import type {Asset, AssetDraft, BackupData, Execution, ExecutionPhoto, OrderDraft, PhotoDraft, WorkOrder, OrderEvent, ExecutionResult} from './types';
import {deletePhotoFile, persistPhoto, MAX_PHOTOS_PER_EXECUTION} from './evidence';
import {localDate, addDays, validDate} from './logic';
import {completionPlan, executionDecision} from './operations';
export {localDate, addDays, validDate} from './logic';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
function database() {
  if (!databasePromise) databasePromise = SQLite.openDatabaseAsync('rotamanutencao.db');
  return databasePromise;
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
    CREATE TABLE IF NOT EXISTS order_events (
      id TEXT PRIMARY KEY NOT NULL,
      order_id TEXT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL CHECK (event_type IN ('blocked','released','executed')),
      reason TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_order ON order_events(order_id, created_at DESC);
  `);
  // Migração não destrutiva para quem já usava o MVP 0.1.
  const fields = await db.getAllAsync<{name: string}>("PRAGMA table_info(executions)");
  if (!fields.some(f => f.name === 'asset_label'))
    await db.execAsync("ALTER TABLE executions ADD COLUMN asset_label TEXT NOT NULL DEFAULT ''");
  if (!fields.some(f => f.name === 'category'))
    await db.execAsync("ALTER TABLE executions ADD COLUMN category TEXT NOT NULL DEFAULT ''");
  const orderFields = await db.getAllAsync<{name: string}>("PRAGMA table_info(work_orders)");
  if (!orderFields.some(f => f.name === 'block_reason'))
    await db.execAsync("ALTER TABLE work_orders ADD COLUMN block_reason TEXT NOT NULL DEFAULT ''");
  if (!orderFields.some(f => f.name === 'blocked_at'))
    await db.execAsync('ALTER TABLE work_orders ADD COLUMN blocked_at TEXT');
  if (!orderFields.some(f => f.name === 'partial_reason'))
    await db.execAsync("ALTER TABLE work_orders ADD COLUMN partial_reason TEXT NOT NULL DEFAULT ''");
  if (!orderFields.some(f => f.name === 'partial_at'))
    await db.execAsync('ALTER TABLE work_orders ADD COLUMN partial_at TEXT');
  if (!fields.some(f => f.name === 'result'))
    await db.execAsync("ALTER TABLE executions ADD COLUMN result TEXT NOT NULL DEFAULT 'completed' CHECK(result IN ('completed','partial'))");
}

export async function listAssets(): Promise<Asset[]> {
  return (await database()).getAllAsync<Asset>('SELECT * FROM assets ORDER BY area, name');
}

export async function listOrders(): Promise<WorkOrder[]> {
  return (await database()).getAllAsync<WorkOrder>(`
    SELECT o.*, a.name AS asset_name, a.code AS asset_code, a.area AS asset_area FROM work_orders o
    LEFT JOIN assets a ON a.id = o.asset_id
    ORDER BY CASE WHEN o.status = 'completed' THEN 2 WHEN o.block_reason != '' THEN 1 ELSE 0 END,
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
    const result = await db.runAsync('UPDATE assets SET name=?, code=?, area=? WHERE id=?',
      name, input.code.trim(), input.area.trim(), existingId);
    if (result.changes !== 1) throw new Error('Equipamento excluído ou desatualizado. Atualize a tela.');
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
  if (!Number.isSafeInteger(input.recurrence_days) || input.recurrence_days < 0 || input.recurrence_days > 36500)
    throw new Error('A periodicidade precisa ser 0 ou um número inteiro de dias.');
  const now = new Date().toISOString();
  if (existingId) {
    const result = await db.runAsync(`UPDATE work_orders SET title=?,description=?,category=?,priority=?,asset_id=?,
      recurrence_days=?,due_date=?,updated_at=? WHERE id=?`,
      title, input.description.trim(), input.category, input.priority,
      input.asset_id, input.recurrence_days, input.due_date, now, existingId);
    if (result.changes !== 1) throw new Error('Atividade excluída ou desatualizada. Atualize a tela.');
  } else {
    await db.runAsync(`INSERT INTO work_orders
      (id,title,description,category,priority,asset_id,recurrence_days,due_date,status,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      makeId(), title, input.description.trim(), input.category, input.priority,
      input.asset_id, input.recurrence_days, input.due_date, 'pending', now, now);
  }
}

export async function listRecentEvents(): Promise<OrderEvent[]> {
  return (await database()).getAllAsync<OrderEvent>(
    `SELECT ev.*, o.title AS order_title FROM order_events ev
     JOIN work_orders o ON o.id=ev.order_id ORDER BY ev.created_at DESC LIMIT 250`
  );
}

export async function setImpediment(orderId: string, reason: string): Promise<void> {
  const clean = reason.trim();
  if (!clean || clean.length > 500) throw new Error('Descreva o impedimento em até 500 caracteres.');
  const db = await database();
  const now = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async tx => {
    const changed = await tx.runAsync(
      `UPDATE work_orders SET block_reason=?, blocked_at=?, updated_at=?
       WHERE id=? AND status='pending' AND block_reason=''`, clean, now, now, orderId
    );
    if (changed.changes !== 1) throw new Error('Atividade indisponível. Atualize os dados.');
    await tx.runAsync('INSERT INTO order_events(id,order_id,event_type,reason,created_at) VALUES(?,?,?,?,?)',
      makeId(), orderId, 'blocked', clean, now);
  });
}

export async function releaseImpediment(orderId: string): Promise<void> {
  const db = await database();
  const now = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async tx => {
    const changed = await tx.runAsync(
      `UPDATE work_orders SET block_reason='', blocked_at=NULL, updated_at=?
       WHERE id=? AND status='pending' AND block_reason != ''`,
      now, orderId
    );
    if (changed.changes !== 1) throw new Error('Impedimento já liberado ou atividade alterada.');
    await tx.runAsync('INSERT INTO order_events(id,order_id,event_type,reason,created_at) VALUES(?,?,?,?,?)',
      makeId(), orderId, 'released', '', now);
  });
}

export async function listAllPhotos(): Promise<ExecutionPhoto[]> {
  return (await database()).getAllAsync<ExecutionPhoto>(
    'SELECT * FROM execution_photos ORDER BY created_at ASC'
  );
}

export async function completeOrder(order: WorkOrder, notes: string, photos: PhotoDraft[] = [], result: ExecutionResult = 'completed'): Promise<void> {
  if (photos.length > MAX_PHOTOS_PER_EXECUTION) throw new Error('Limite de 6 fotos por execução.');
  const db = await database();
  const now = new Date().toISOString();
  const today = localDate();
  const executionId = makeId();
  const savedFiles: string[] = [];
  // Evita gastar espaço copiando imagens se a OS já foi alterada ou impedida.
  const initial = await db.getFirstAsync<WorkOrder>('SELECT * FROM work_orders WHERE id=?', order.id);
  const initialPlan = completionPlan(order, initial, today);
  executionDecision(result, notes, initialPlan.nextDue);
  try {
    for (const photo of photos) savedFiles.push(await persistPhoto(photo));
    await db.withExclusiveTransactionAsync(async (tx) => {
      // Revalidação dentro da transação: alteração entre a abertura do formulário e o clique.
      const current = await tx.getFirstAsync<WorkOrder & {asset_name: string | null; asset_code: string | null; asset_area: string | null}>(
        `SELECT o.*, a.name AS asset_name, a.code AS asset_code, a.area AS asset_area
         FROM work_orders o LEFT JOIN assets a ON a.id=o.asset_id WHERE o.id=?`, order.id);
      const plan = completionPlan(order, current, today);
      const decision = executionDecision(result, notes, plan.nextDue);
      const changed = await tx.runAsync(`UPDATE work_orders
        SET status=?,due_date=?,partial_reason=?,partial_at=?,updated_at=?
        WHERE id=? AND status='pending' AND block_reason='' AND updated_at=?`,
        decision.orderStatus, decision.nextDue ?? current!.due_date,
        decision.partialReason, result === 'partial' ? now : null,
        now, order.id, order.updated_at);
      if (changed.changes !== 1) throw new Error('Atividade alterada. Atualize a tela.');
      const assetLabel = [current!.asset_code, current!.asset_name, current!.asset_area]
        .filter(Boolean).join(' · ').slice(0, 300);
      await tx.runAsync(`INSERT INTO executions
        (id,order_id,order_title,notes,executed_at,previous_due_date,next_due_date,asset_label,category,result)
        VALUES (?,?,?,?,?,?,?,?,?,?)`,
        executionId, order.id, current!.title, decision.notes, now, current!.due_date, decision.nextDue,
        assetLabel, current!.category, result);
      if (result === 'completed') {
        await tx.runAsync('INSERT INTO order_events(id,order_id,event_type,reason,created_at) VALUES(?,?,?,?,?)',
          makeId(), order.id, 'executed', '', now);
      }
      for (let i = 0; i < savedFiles.length; i++) {
        await tx.runAsync(`INSERT INTO execution_photos
          (id,execution_id,filename,mime_type,created_at) VALUES (?,?,?,?,?)`,
          makeId(), executionId, savedFiles[i], photos[i].mime_type, now);
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
  // Snapshot consistente. Leituras concorrentes soltas poderiam misturar versões diferentes.
  let assets: Asset[] = [];
  let work_orders: BackupData['work_orders'] = [];
  let executions: BackupData['executions'] = [];
  let photos: ExecutionPhoto[] = [];
  let order_events: OrderEvent[] = [];
  await db.withExclusiveTransactionAsync(async tx => {
    assets = await tx.getAllAsync<Asset>('SELECT * FROM assets');
    work_orders = await tx.getAllAsync<BackupData['work_orders'][number]>('SELECT * FROM work_orders');
    executions = await tx.getAllAsync<BackupData['executions'][number]>('SELECT * FROM executions');
    photos = await tx.getAllAsync<ExecutionPhoto>('SELECT * FROM execution_photos');
    order_events = await tx.getAllAsync<OrderEvent>('SELECT * FROM order_events');
  });
  return {assets, work_orders, executions, photos, order_events};
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
        (id,title,description,category,priority,asset_id,recurrence_days,due_date,status,created_at,updated_at,block_reason,blocked_at,partial_reason,partial_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, o.id,o.title,o.description,o.category,o.priority,o.asset_id,
        o.recurrence_days,o.due_date,o.status,o.created_at,o.updated_at, o.block_reason ?? '', o.blocked_at ?? null,
        o.partial_reason ?? '', o.partial_at ?? null);
    }
    for (const e of data.executions) {
      await tx.runAsync(`INSERT INTO executions
        (id,order_id,order_title,notes,executed_at,previous_due_date,next_due_date,asset_label,category,result)
        VALUES (?,?,?,?,?,?,?,?,?,?)`, e.id,e.order_id,e.order_title,e.notes,e.executed_at,
        e.previous_due_date,e.next_due_date,e.asset_label,e.category, e.result ?? 'completed');
    }
    for (const event of data.order_events ?? []) {
      await tx.runAsync('INSERT INTO order_events (id,order_id,event_type,reason,created_at) VALUES (?,?,?,?,?)',
        event.id, event.order_id, event.event_type, event.reason, event.created_at);
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
