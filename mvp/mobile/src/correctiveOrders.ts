import type {Category,Priority} from './types';
import {getDatabase} from './db';
import {localDate} from './logic';

export type CorrectiveLink = {item_id:string;order_id:string;created_at:string};
export type CorrectiveView = CorrectiveLink & {
  order_title:string;order_status:'pending'|'completed';order_priority:Priority;
  order_category:Category;order_archived_at:string|null;order_block_reason:string;order_partial_reason:string;
};

/** Origem preservada por item de uma execução, sem copiar ou mudar o checklist. */
export async function listRunCorrectives(runId:string):Promise<CorrectiveView[]> {
  const db=await getDatabase();
  return db.getAllAsync<CorrectiveView>(`SELECT link.*,o.title AS order_title,
    o.status AS order_status,o.priority AS order_priority,o.category AS order_category,
    o.archived_at AS order_archived_at,o.block_reason AS order_block_reason,
    o.partial_reason AS order_partial_reason
    FROM route_corrective_links link JOIN work_orders o ON o.id=link.order_id
    JOIN route_run_items i ON i.id=link.item_id WHERE i.run_id=?`,runId);
}

export type RouteAnomalyView={
  item_id:string;run_id:string;point_title:string;asset_label:string;
  notes:string;recorded_at:string|null;route_title:string;
  order_id:string|null;order_status:'pending'|'completed'|null;order_archived_at:string|null;
};

/** Histórico compacto para acompanhamento, não resolve ocorrências automaticamente. */
export async function listRouteAnomalies():Promise<RouteAnomalyView[]>{
  const db=await getDatabase();
  return db.getAllAsync<RouteAnomalyView>(`
    SELECT i.id AS item_id,i.run_id,i.point_title,i.asset_label,i.notes,i.recorded_at,
      r.route_title,l.order_id,o.status AS order_status,o.archived_at AS order_archived_at
    FROM route_run_items i
    JOIN route_runs r ON r.id=i.run_id
    LEFT JOIN route_corrective_links l ON l.item_id=i.id
    LEFT JOIN work_orders o ON o.id=l.order_id
    WHERE i.status='anomaly'
    ORDER BY i.recorded_at DESC,i.id DESC LIMIT 100`);
}

/** Não abre OS sem confirmação na interface. A checagem de duplicidade é transacional. */
export async function createCorrectiveOrder(itemId:string,category:Category,priority:Priority):Promise<string>{
  if(!itemId.trim())throw new Error('Selecione um ponto com anomalia.');
  if(!['Lubrificação','Mecânica','Elétrica','Inspeção','Segurança'].includes(category))
    throw new Error('Escolha uma especialidade válida.');
  if(!['Baixa','Média','Alta'].includes(priority))throw new Error('Prioridade inválida.');
  const db=await getDatabase();
  const orderId=`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,11)}`;
  const now=new Date().toISOString();
  await db.withExclusiveTransactionAsync(async tx=>{
    const item=await tx.getFirstAsync<{
      id:string;status:string;notes:string;recorded_at:string|null;point_title:string;asset_id:string|null;
      asset_label:string;run_id:string;route_title:string;
    }>(`SELECT i.id,i.status,i.notes,i.recorded_at,i.point_title,i.asset_id,i.asset_label,
       i.run_id,r.route_title
       FROM route_run_items i JOIN route_runs r ON r.id=i.run_id WHERE i.id=?`,itemId);
    if(!item||item.status!=='anomaly'||!item.notes.trim()||!item.recorded_at) {
      throw new Error('Registre e salve primeiro a anomalia do ponto.');
    }
    const existing=await tx.getFirstAsync<{order_id:string}>(
      'SELECT order_id FROM route_corrective_links WHERE item_id=?',itemId);
    if(existing)throw new Error('Este ponto já possui uma OS corretiva vinculada. Não foi criada outra.');
    if(!item.asset_id)throw new Error('Equipamento sem TAG vinculada. É necessário um vínculo válido para a OS.');
    const asset=await tx.getFirstAsync<{id:string}>('SELECT id FROM assets WHERE id=?',item.asset_id);
    if(!asset)throw new Error('Equipamento excluído. Atualize o cadastro antes de gerar a OS.');
    const title=('Corrigir: '+item.point_title).slice(0,300);
    const description=[
      `Origem: rota ${item.route_title}`,
      `Equipamento: ${item.asset_label||'TAG não informada'}`,
      `Anomalia identificada: ${item.notes.trim()}`,
      `Identificador da ocorrência: ${item.id}`,
    ].join('\n').slice(0,10000);
    await tx.runAsync(`INSERT INTO work_orders
      (id,title,description,category,priority,asset_id,recurrence_days,due_date,status,created_at,updated_at)
      VALUES(?,?,?,?,?,?,0,?,'pending',?,?)`,
      orderId,title,description,category,priority,item.asset_id,localDate(),now,now);
    await tx.runAsync('INSERT INTO route_corrective_links(item_id,order_id,created_at) VALUES(?,?,?)',
      item.id,orderId,now);
  });
  return orderId;
}
