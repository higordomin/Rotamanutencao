import type {BackupData} from './types';
import {validDate} from './logic.ts';

// JSON com fotos incorporadas: simples e portável, mas limitado em tamanho.
export const MAX_BACKUP_BYTES = 60 * 1024 * 1024;
export const MAX_RECORDS = 20000;
const ALLOWED_CATEGORIES = new Set(['Lubrificação', 'Mecânica', 'Elétrica', 'Inspeção']);
const ALLOWED_PRIORITIES = new Set(['Baixa', 'Média', 'Alta']);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, max = 10000): v is string => typeof v === 'string' && v.length <= max;
const ident = (v: unknown): v is string => str(v, 100) && v.length > 0;
const iso = (v: unknown): v is string => str(v, 50) && !Number.isNaN(Date.parse(v));

export function validateBackup(data: unknown): asserts data is BackupData {
  if (!isObj(data) || data.format !== 'rotamanutencao-offline' || ![2, 3, 4].includes(data.version as number))
    throw new Error('Arquivo incompatível. É necessário um backup RotaManutenção v2, v3 ou v4.');
  if (!Array.isArray(data.assets) || data.assets.length > MAX_RECORDS) throw new Error('Equipamentos inválidos.');
  if (!Array.isArray(data.work_orders) || data.work_orders.length > MAX_RECORDS) throw new Error('Atividades inválidas.');
  if (!Array.isArray(data.executions) || data.executions.length > MAX_RECORDS) throw new Error('Execuções inválidas.');
  if (!Array.isArray(data.photos) || data.photos.length > MAX_RECORDS) throw new Error('Fotos inválidas.');
  if (!iso(data.exported_at)) throw new Error('Data do backup inválida.');
  if (data.version >= 3 && (!Array.isArray(data.order_events) || data.order_events.length > MAX_RECORDS))
    throw new Error('Eventos do backup ausentes ou inválidos.');
  if (data.order_events !== undefined && (!Array.isArray(data.order_events) || data.order_events.length > MAX_RECORDS))
    throw new Error('Eventos inválidos.');
  const ids = (items: unknown[], name: string) => {
    const seen = new Set<string>();
    for (const item of items) {
      if (!isObj(item) || !ident(item.id) || seen.has(item.id))
        throw new Error(`Identificador inválido ou repetido: ${name}.`);
      seen.add(item.id);
    }
    return seen;
  };
  const aIds = ids(data.assets, 'equipamentos');
  const oIds = ids(data.work_orders, 'atividades');
  const eIds = ids(data.executions, 'execuções');
  ids(data.photos, 'fotos');
  for (const a of data.assets) {
    if (!str(a.name, 300) || !a.name.trim() || !str(a.code, 200) || !str(a.area, 200) || !iso(a.created_at))
      throw new Error('Equipamento com campos inválidos.');
  }
  for (const o of data.work_orders) {
    if (!str(o.title, 300) || !o.title.trim() || !str(o.description, 10000)
      || !ALLOWED_CATEGORIES.has(o.category) || !ALLOWED_PRIORITIES.has(o.priority)
      || (o.asset_id !== null && (!ident(o.asset_id) || !aIds.has(o.asset_id)))
      || !Number.isSafeInteger(o.recurrence_days) || o.recurrence_days < 0 || o.recurrence_days > 36500
      || !validDate(o.due_date) || !['pending', 'completed'].includes(o.status)
      || !iso(o.created_at) || !iso(o.updated_at)
      || (o.block_reason !== undefined && !str(o.block_reason, 500))
      || (o.blocked_at !== undefined && o.blocked_at !== null && !iso(o.blocked_at))
      || (data.version >= 3 && (!str(o.block_reason, 500) || (o.blocked_at !== null && !iso(o.blocked_at))
        || (!!o.block_reason !== !!o.blocked_at)
        || (o.status === 'completed' && !!o.block_reason)))
      || (data.version === 4 && (
        !str(o.partial_reason, 1000)
        || (o.partial_at !== null && !iso(o.partial_at))
        || (!!o.partial_reason !== !!o.partial_at)
        || (o.status === 'completed' && !!o.partial_reason))))
      throw new Error('Atividade com dados ou vínculos inválidos.');
  }
  for (const e of data.executions) {
    if (!ident(e.order_id) || !oIds.has(e.order_id) || !str(e.order_title, 300)
      || !str(e.notes, 10000) || !iso(e.executed_at) || !validDate(e.previous_due_date)
      || (e.next_due_date !== null && !validDate(e.next_due_date))
      || !str(e.asset_label, 300) || !str(e.category, 100)
      || (data.version === 4 && (!['partial','completed'].includes(e.result)
        || (e.result === 'partial' && (e.notes.trim().length < 10 || e.notes.trim().length > 1000
          || e.next_due_date !== null)))))
      throw new Error('Execução com dados ou vínculos inválidos.');
  }
  if (data.order_events) {
    ids(data.order_events, 'eventos');
    for (const ev of data.order_events) {
      if (!ident(ev.order_id) || !oIds.has(ev.order_id)
        || !['blocked', 'released', 'executed'].includes(ev.event_type)
        || !str(ev.reason, 500) || !iso(ev.created_at)
        || (ev.event_type === 'blocked' && !ev.reason.trim()))
        throw new Error('Evento de impedimento inválido.');
    }
  }
  const imagesPerExecution = new Map<string, number>();
  for (const p of data.photos) {
    if (!ident(p.execution_id) || !eIds.has(p.execution_id) || !str(p.filename, 120)
      || !['image/jpeg', 'image/png'].includes(p.mime_type) || !iso(p.created_at)
      || !str(p.base64, 7_500_000) || p.base64.length < 10
      || p.base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(p.base64)
      || (p.mime_type === 'image/jpeg' && !p.base64.startsWith('/9j/'))
      || (p.mime_type === 'image/png' && !p.base64.startsWith('iVBORw0KGgo')))
      throw new Error('Foto inválida no arquivo de backup.');
    const count = (imagesPerExecution.get(p.execution_id) || 0) + 1;
    if (count > 6) throw new Error('O backup contém mais de 6 fotos por execução.');
    imagesPerExecution.set(p.execution_id, count);
  }
}

