import type {BackupData} from './types';
import {validDate} from './logic.ts';

// JSON com fotos incorporadas: simples e portável, mas limitado em tamanho.
export const MAX_BACKUP_BYTES = 60 * 1024 * 1024;
export const MAX_RECORDS = 20000;
const ALLOWED_CATEGORIES = new Set(['Lubrificação', 'Mecânica', 'Elétrica', 'Inspeção', 'Segurança']);
const ALLOWED_PRIORITIES = new Set(['Baixa', 'Média', 'Alta']);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, max = 10000): v is string => typeof v === 'string' && v.length <= max;
const ident = (v: unknown): v is string => str(v, 100) && v.length > 0;
const iso = (v: unknown): v is string => str(v, 50) && !Number.isNaN(Date.parse(v));

export function validateBackup(data: unknown): asserts data is BackupData {
  if (!isObj(data) || data.format !== 'rotamanutencao-offline' || ![2, 3, 4, 5, 6, 7, 8, 9, 10, 11].includes(data.version as number))
    throw new Error('Arquivo incompatível. É necessário um backup RotaManutenção v2, v3, v4, v5, v6, v7, v8, v9, v10 ou v11.');
  if (!Array.isArray(data.assets) || data.assets.length > MAX_RECORDS) throw new Error('Equipamentos inválidos.');
  if (!Array.isArray(data.work_orders) || data.work_orders.length > MAX_RECORDS) throw new Error('Atividades inválidas.');
  if (!Array.isArray(data.executions) || data.executions.length > MAX_RECORDS) throw new Error('Execuções inválidas.');
  if (!Array.isArray(data.photos) || data.photos.length > MAX_RECORDS) throw new Error('Fotos inválidas.');
  if (!iso(data.exported_at)) throw new Error('Data do backup inválida.');
  if ((data.version as number) >= 3 && (!Array.isArray(data.order_events) || data.order_events.length > MAX_RECORDS))
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
      || ((data.version as number) >= 3 && (!str(o.block_reason, 500) || (o.blocked_at !== null && !iso(o.blocked_at))
        || (!!o.block_reason !== !!o.blocked_at)
        || (o.status === 'completed' && !!o.block_reason)))
      || ((data.version as number) >= 8 && (
        (o.archived_at!==null && !iso(o.archived_at))
        || !str(o.archive_reason,500)
        || (!!o.archived_at !== !!o.archive_reason)
        || (!!o.archived_at && o.archive_reason.trim().length<10)))
      || ((data.version as number) >= 4 && (
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
      // Histórico pode referenciar um ativo posteriormente excluído do cadastro.
      || ((data.version as number) >= 9 && !(e.asset_id === null || ident(e.asset_id)))
      || ((data.version as number) >= 4 && (!['partial','completed'].includes(e.result)
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
  // Rotas: v5 e v6 exigem coleções completas, inclusive quando estão vazias.
  const routeCollections = ['routes','route_points','route_runs','route_run_items'] as const;
  if ((data.version as number) >= 5) {
    const d = data as unknown as BackupData;
    for (const key of routeCollections) {
      const value=data[key];
      if (!Array.isArray(value) || value.length > MAX_RECORDS) throw new Error('Dados das rotas ausentes ou acima do limite: '+key);
    }
    const routeIds=ids(d.routes!, 'rotas');
    const pointIds=ids(d.route_points!, 'pontos de rota');
    const runIds=ids(d.route_runs!, 'execuções de rota');
    ids(d.route_run_items!, 'registros dos pontos');
    for (const r of d.routes!) {
      if(!str(r.title,200)||!r.title.trim()||!str(r.area,200)||!iso(r.created_at)
        || ((data.version as number) >= 7 && (
          !Number.isSafeInteger(r.recurrence_days)||r.recurrence_days<0||r.recurrence_days>36500
          || (r.next_due_date!==null && !validDate(r.next_due_date))
          || (r.recurrence_days===0 && r.next_due_date!==null)
          || (r.recurrence_days>0 && !r.next_due_date)
          || !Number.isSafeInteger(r.attention_count)||r.attention_count<0||r.attention_count>100
          || (r.attention_at!==null && !iso(r.attention_at))
          || (!!r.attention_count !== !!r.attention_at))))
        throw new Error('Rota com dados inválidos.');
    }
    for (const p of d.route_points!) {
      if(!ident(p.route_id)||!routeIds.has(p.route_id)
        || (p.asset_id!==null&&(!ident(p.asset_id)||!aIds.has(p.asset_id)))
        || !str(p.title,200)||!p.title.trim()||!str(p.lubricant,200)
        || !Number.isFinite(p.quantity_grams)||p.quantity_grams<0||p.quantity_grams>100000
        || !Number.isSafeInteger(p.position)||p.position<0)
        throw new Error('Ponto de rota inválido.');
    }
    for (const r of d.route_runs!) {
      if((r.route_id!==null&&(!ident(r.route_id)||!routeIds.has(r.route_id)))
        || !str(r.route_title,200)||!r.route_title.trim()||!iso(r.started_at)
        || (r.finished_at!==null&&!iso(r.finished_at)))
        throw new Error('Execução de rota inválida.');
    }
    const counts=new Map<string,{items:number;pending:number}>();
    for (const i of d.route_run_items!) {
      if(!ident(i.run_id)||!runIds.has(i.run_id)||!ident(i.point_id)
        || !str(i.point_title,200)||!i.point_title.trim()||!str(i.asset_label,300)
        || ((data.version as number) >= 10 && !(i.asset_id===null || ident(i.asset_id)))
        || !str(i.lubricant,200)||!Number.isFinite(i.quantity_grams)||i.quantity_grams<0||i.quantity_grams>100000
        || !['pending','done','anomaly','skipped'].includes(i.status)
        || (i.status==='skipped'&&i.quantity_grams!==0)
        || !str(i.notes,1000)||!Number.isSafeInteger(i.position)||i.position<0
        || (i.recorded_at!==null&&!iso(i.recorded_at))
        || (i.status==='pending'&&(i.recorded_at!==null||!!i.notes))
        || (i.status!=='pending'&&!i.recorded_at)
        || ((i.status==='anomaly'||i.status==='skipped')&&i.notes.trim().length<10))
        throw new Error('Registro de checklist inválido.');
      const count=counts.get(i.run_id)||{items:0,pending:0};
      count.items++; if(i.status==='pending')count.pending++;
      counts.set(i.run_id,count);
    }
    for (const r of d.route_runs!) {
      const stat=counts.get(r.id);
      if(!stat?.items || (r.finished_at!==null&&stat.pending>0))
        throw new Error('Execução de rota incompleta ou vazia.');
    }
    void pointIds; // O registro executado guarda snapshot e pode apontar para ponto já removido.
  }
  if ((data.version as number) >= 6) {
    if (!Array.isArray(data.route_photos) || data.route_photos.length > MAX_RECORDS)
      throw new Error('Fotos dos pontos ausentes ou acima do limite.');
    ids(data.route_photos,'fotos dos pontos');
    const d = data as unknown as BackupData;
    const itemIds = new Set((d.route_run_items ?? []).map(i => i.id));
    const items = new Map((d.route_run_items ?? []).map(i => [i.id, i]));
    const counts = new Map<string,number>();
    for (const p of data.route_photos) {
      if (!ident(p.item_id)||!itemIds.has(p.item_id)
        || !str(p.filename,120) || !/^[a-zA-Z0-9_-]+\.(jpe?g|png)$/.test(p.filename)
        || !['image/jpeg','image/png'].includes(p.mime_type)||!iso(p.created_at)
        || !str(p.base64,7_500_000)||p.base64.length<10
        || p.base64.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(p.base64)
        || (p.mime_type==='image/jpeg'&&!p.base64.startsWith('/9j/'))
        || (p.mime_type==='image/png'&&!p.base64.startsWith('iVBORw0KGgo'))
        || items.get(p.item_id)?.status==='pending')
        throw new Error('Foto de ponto inválida ou vinculada a registro pendente.');
      const n=(counts.get(p.item_id)??0)+1;
      if(n>4)throw new Error('O ponto contém mais de 4 fotos.');
      counts.set(p.item_id,n);
    }
  }
  // Links de OS corretivas só foram introduzidos no backup v11.
  if ((data.version as number) >= 11) {
    if(!Array.isArray(data.route_corrective_links)||data.route_corrective_links.length>MAX_RECORDS)
      throw new Error('Vínculos de OS corretivas ausentes ou inválidos.');
    const idsOfItems=new Map((data.route_run_items??[]).map(item=>[item.id,item]));
    const usedOrders=new Set<string>();
    const usedItems=new Set<string>();
    for(const link of data.route_corrective_links) {
      if(!isObj(link)||!ident(link.item_id)||!ident(link.order_id)||!iso(link.created_at)
        ||usedItems.has(link.item_id)||usedOrders.has(link.order_id)
        ||!oIds.has(link.order_id)||idsOfItems.get(link.item_id)?.status!=='anomaly')
        throw new Error('Vínculo de OS corretiva inválido ou repetido.');
      usedItems.add(link.item_id);usedOrders.add(link.order_id);
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

