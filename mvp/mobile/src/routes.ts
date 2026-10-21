import type {Asset} from './types';
import {getDatabase} from './db';

export type Route = {id:string;title:string;area:string;created_at:string;point_count?:number};
export type RoutePoint = {id:string;route_id:string;asset_id:string|null;title:string;lubricant:string;
  quantity_grams:number;position:number;asset_name?:string|null;asset_code?:string|null;asset_area?:string|null};
export type RouteRun = {id:string;route_id:string|null;route_title:string;started_at:string;finished_at:string|null};
export type RouteRunItem = {id:string;run_id:string;point_id:string;point_title:string;asset_label:string;
  lubricant:string;quantity_grams:number;status:'pending'|'done'|'anomaly'|'skipped';notes:string;
  recorded_at:string|null;position:number};
export type RouteBackupRows = {routes:Route[];route_points:RoutePoint[];route_runs:RouteRun[];route_run_items:RouteRunItem[]};

function id() {return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,11)}`;}
function str(v:string, max:number, name:string) {
  const x=v.trim();
  if(!x || x.length>max) throw new Error(`Informe ${name} (até ${max} caracteres).`);
  return x;
}
export function gramAmount(input:string|number):number {
  const parsed= typeof input==='string' ? Number(input.trim().replace(',','.')):input;
  if(!Number.isFinite(parsed)||parsed<0||parsed>100000||Math.round(parsed*1000)!==parsed*1000)
    throw new Error('Quantidade inválida: informe gramas entre 0 e 100000, até 3 casas decimais.');
  return parsed;
}
export function routeResult(status:RouteRunItem['status'],notes:string) {
  if(!['done','anomaly','skipped'].includes(status)) throw new Error('Escolha o resultado do ponto.');
  const message=notes.trim();
  if(message.length>1000)throw new Error('Observação do ponto excede 1000 caracteres.');
  if(status!=='done' && message.length<10)
    throw new Error('Explique a anomalia ou motivo de não execução (mínimo 10 caracteres).');
  return message;
}
export async function listRoutes():Promise<Route[]> {
  const db=await getDatabase();
  return db.getAllAsync<Route>(`SELECT r.*, (SELECT COUNT(*) FROM route_points p WHERE p.route_id=r.id) AS point_count
    FROM routes r ORDER BY r.area,r.title`);
}
export async function listRoutePoints(routeId:string):Promise<RoutePoint[]> {
  const db=await getDatabase();
  return db.getAllAsync<RoutePoint>(`SELECT p.*,a.name asset_name,a.code asset_code,a.area asset_area
    FROM route_points p LEFT JOIN assets a ON a.id=p.asset_id WHERE p.route_id=? ORDER BY p.position,p.id`,routeId);
}
export async function createRoute(title:string,area:string):Promise<void> {
  const name=str(title,200,'o nome da rota');
  if(area.length>200)throw new Error('Setor muito longo.');
  const db=await getDatabase();
  await db.runAsync('INSERT INTO routes(id,title,area,created_at) VALUES(?,?,?,?)',id(),name,area.trim(),new Date().toISOString());
}
export async function addRoutePoint(routeId:string,assetId:string,title:string,lubricant:string,quantity:string):Promise<void> {
  const task=str(title,200,'o ponto da rota');
  const amount=gramAmount(quantity);
  if(lubricant.length>200)throw new Error('Nome do lubrificante muito longo.');
  const db=await getDatabase();
  await db.withExclusiveTransactionAsync(async tx=>{
    const route=await tx.getFirstAsync<{id:string}>('SELECT id FROM routes WHERE id=?',routeId);
    if(!route)throw new Error('Rota não encontrada.');
    const asset=await tx.getFirstAsync<Pick<Asset,'id'>>('SELECT id FROM assets WHERE id=?',assetId);
    if(!asset)throw new Error('Selecione um equipamento cadastrado.');
    const count=await tx.getFirstAsync<{n:number}>('SELECT COUNT(*) n FROM route_points WHERE route_id=?',routeId);
    if((count?.n??0)>=100)throw new Error('Limite de 100 pontos por rota.');
    await tx.runAsync(`INSERT INTO route_points(id,route_id,asset_id,title,lubricant,quantity_grams,position)
      VALUES(?,?,?,?,?,?,?)`,id(),routeId,assetId,task,lubricant.trim(),amount,count?.n??0);
  });
}
export async function deleteRoutePoint(pointId:string):Promise<void> {
  const db=await getDatabase();
  await db.runAsync('DELETE FROM route_points WHERE id=?',pointId);
}
export async function deleteRoute(routeId:string):Promise<void> {
  const db=await getDatabase();
  await db.runAsync('DELETE FROM routes WHERE id=?',routeId);
}
export async function listRouteRuns():Promise<RouteRun[]> {
  const db=await getDatabase();
  return db.getAllAsync<RouteRun>('SELECT * FROM route_runs ORDER BY started_at DESC LIMIT 100');
}
export async function listRunItems(runId:string):Promise<RouteRunItem[]> {
  const db=await getDatabase();
  return db.getAllAsync<RouteRunItem>('SELECT * FROM route_run_items WHERE run_id=? ORDER BY position,id',runId);
}
export async function startRouteRun(routeId:string):Promise<string> {
  const db=await getDatabase();
  const runId=id(),started=new Date().toISOString();
  await db.withExclusiveTransactionAsync(async tx=>{
    const route=await tx.getFirstAsync<Route>('SELECT * FROM routes WHERE id=?',routeId);
    if(!route)throw new Error('Rota não encontrada.');
    const active=await tx.getFirstAsync<{id:string}>('SELECT id FROM route_runs WHERE route_id=? AND finished_at IS NULL',routeId);
    if(active)throw new Error('Esta rota já possui uma execução em andamento.');
    const points=await tx.getAllAsync<RoutePoint>(`SELECT p.*,a.name asset_name,a.code asset_code,a.area asset_area
      FROM route_points p LEFT JOIN assets a ON a.id=p.asset_id WHERE p.route_id=? ORDER BY p.position,p.id`,routeId);
    if(!points.length)throw new Error('Cadastre ao menos um ponto antes de iniciar.');
    await tx.runAsync('INSERT INTO route_runs(id,route_id,route_title,started_at,finished_at) VALUES(?,?,?,?,NULL)',
      runId,routeId,route.title,started);
    for(const point of points) {
      const label=[point.asset_code,point.asset_name,point.asset_area].filter(Boolean).join(' · ').slice(0,300);
      await tx.runAsync(`INSERT INTO route_run_items
      (id,run_id,point_id,point_title,asset_label,lubricant,quantity_grams,status,notes,recorded_at,position)
      VALUES(?,?,?,?,?,?,?,'pending','',NULL,?)`,
      id(),runId,point.id,point.title,label,point.lubricant,point.quantity_grams,point.position);
    }
  });
  return runId;
}
export async function recordRoutePoint(itemId:string,status:RouteRunItem['status'],notes:string,lubricant:string,quantity:string):Promise<void> {
  const message=routeResult(status,notes),grams=gramAmount(quantity);
  if(lubricant.length>200)throw new Error('Nome do lubrificante muito longo.');
  const db=await getDatabase();
  await db.withExclusiveTransactionAsync(async tx=>{
    const updated=await tx.runAsync(`UPDATE route_run_items SET status=?,notes=?,lubricant=?,quantity_grams=?,recorded_at=?
    WHERE id=? AND EXISTS(SELECT 1 FROM route_runs r WHERE r.id=route_run_items.run_id AND r.finished_at IS NULL)`,
    status,message,lubricant.trim(),grams,new Date().toISOString(),itemId);
    if(updated.changes!==1)throw new Error('Ponto não encontrado ou rota já encerrada.');
  });
}
export async function finishRouteRun(runId:string):Promise<void> {
  const db=await getDatabase();
  await db.withExclusiveTransactionAsync(async tx=>{
    const remaining=await tx.getFirstAsync<{n:number}>(`SELECT COUNT(*) n FROM route_run_items
      WHERE run_id=? AND status='pending'`,runId);
    if(remaining?.n)throw new Error(`Existem ${remaining.n} pontos sem registro. Conclua ou marque como não executados.`);
    const count=await tx.getFirstAsync<{n:number}>('SELECT COUNT(*) n FROM route_run_items WHERE run_id=?',runId);
    if(!count?.n)throw new Error('Execução sem pontos.');
    const changed=await tx.runAsync('UPDATE route_runs SET finished_at=? WHERE id=? AND finished_at IS NULL',
      new Date().toISOString(),runId);
    if(changed.changes!==1)throw new Error('Esta rota já foi finalizada.');
  });
}
