import type {Asset,PhotoDraft} from './types';
import {persistPhoto,deletePhotoFile} from './evidence';
import {getDatabase} from './db';
import {gramAmount,routeResult,appliedGrams} from './routeRules';
import {localDate} from './logic';
import {routePlanInput,planAfterRouteRun} from './routeSchedule';
import {assetSnapshot,buildLegacyAssetIndex} from './assetWorkflow';

export type Route = {id:string;title:string;area:string;created_at:string;point_count?:number;
  recurrence_days:number;next_due_date:string|null;attention_count:number;attention_at:string|null};
export type RoutePoint = {id:string;route_id:string;asset_id:string|null;title:string;lubricant:string;
  quantity_grams:number;position:number;asset_name?:string|null;asset_code?:string|null;asset_area?:string|null};
export type RouteRun = {id:string;route_id:string|null;route_title:string;started_at:string;finished_at:string|null};
export type RouteRunPhoto = {id:string;item_id:string;filename:string;
  mime_type:'image/jpeg'|'image/png';created_at:string};
export type RouteRunItem = {id:string;run_id:string;point_id:string;point_title:string;asset_label:string;
  asset_id:string|null; // snapshot persistente, independente do cadastro atual
  lubricant:string;quantity_grams:number;status:'pending'|'done'|'anomaly'|'skipped';notes:string;
  recorded_at:string|null;position:number};
/** Registro de ponto por ativo no histórico, inclusive de rotas excluídas. */
export type AssetRouteHistoryItem = RouteRunItem & {
  route_title:string;started_at:string;finished_at:string|null;
  photo_count:number;first_photo:string|null;
};
export const MAX_ROUTE_PHOTOS = 4;
export type RouteBackupRows = {routes:Route[];route_points:RoutePoint[];route_runs:RouteRun[];route_run_items:RouteRunItem[]};

function id() {return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,11)}`;}
function str(v:string, max:number, name:string) {
  const x=v.trim();
  if(!x || x.length>max) throw new Error(`Informe ${name} (até ${max} caracteres).`);
  return x;
}
export async function listRoutes():Promise<Route[]> {
  const db=await getDatabase();
  return db.getAllAsync<Route>(`SELECT r.*, (SELECT COUNT(*) FROM route_points p WHERE p.route_id=r.id) AS point_count
    FROM routes r ORDER BY
      CASE WHEN r.attention_count>0 THEN 0 WHEN r.recurrence_days>0 AND r.next_due_date IS NOT NULL THEN 1 ELSE 2 END,
      r.next_due_date,r.area,r.title`);
}
export async function listRoutePoints(routeId:string):Promise<RoutePoint[]> {
  const db=await getDatabase();
  return db.getAllAsync<RoutePoint>(`SELECT p.*,a.name asset_name,a.code asset_code,a.area asset_area
    FROM route_points p LEFT JOIN assets a ON a.id=p.asset_id WHERE p.route_id=? ORDER BY p.position,p.id`,routeId);
}
export async function createRoute(title:string,area:string,recurrence='0',due:string|null=null):Promise<void> {
  const name=str(title,200,'o nome da rota');
  if(area.length>200)throw new Error('Setor muito longo.');
  const plan=routePlanInput(recurrence,due);
  const db=await getDatabase();
  await db.runAsync(`INSERT INTO routes
    (id,title,area,created_at,recurrence_days,next_due_date,attention_count,attention_at)
    VALUES(?,?,?,?,?,?,0,NULL)`,id(),name,area.trim(),new Date().toISOString(),
      plan.recurrence_days,plan.next_due_date);
}
export async function updateRouteSchedule(routeId:string,recurrence:string,due:string|null):Promise<void>{
  const plan=routePlanInput(recurrence,due);
  const db=await getDatabase();
  // Não ocultar uma anomalia aberta alterando manualmente a programação.
  const changed=await db.runAsync(`UPDATE routes SET recurrence_days=?,next_due_date=?
    WHERE id=?`,plan.recurrence_days,plan.next_due_date,routeId);
  if(changed.changes!==1)throw new Error('Rota não encontrada.');
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
export async function listRunPhotos(runId:string):Promise<RouteRunPhoto[]> {
  const db=await getDatabase();
  return db.getAllAsync<RouteRunPhoto>(`SELECT p.* FROM route_run_photos p
    JOIN route_run_items i ON i.id=p.item_id WHERE i.run_id=? ORDER BY p.created_at,p.id`,runId);
}
/**
 * Histórico por TAG com vínculo por ID. Backups legados sem vínculo só entram
 * se o retrato for inequívoco entre os equipamentos atualmente cadastrados.
 */
export async function listAssetRouteHistory(
  asset:Pick<Asset,'id'|'code'|'name'|'area'>,
  allAssets:ReadonlyArray<Pick<Asset,'id'|'code'|'name'|'area'>>,
):Promise<AssetRouteHistoryItem[]> {
  const db=await getDatabase();
  const label=assetSnapshot(asset);
  const legacy=buildLegacyAssetIndex(allAssets).get(label)===asset.id?label:null;
  return db.getAllAsync<AssetRouteHistoryItem>(`
    SELECT i.*, r.route_title,r.started_at,r.finished_at,
       (SELECT COUNT(*) FROM route_run_photos p WHERE p.item_id=i.id) AS photo_count,
       (SELECT filename FROM route_run_photos p WHERE p.item_id=i.id
        ORDER BY p.created_at,p.id LIMIT 1) AS first_photo
    FROM route_run_items i JOIN route_runs r ON r.id=i.run_id
    WHERE i.asset_id=? OR (i.asset_id IS NULL AND ? IS NOT NULL AND i.asset_label=?)
    ORDER BY r.started_at DESC,i.position LIMIT 300
  `,asset.id,legacy,legacy);
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
      (id,run_id,point_id,point_title,asset_label,lubricant,quantity_grams,status,notes,recorded_at,position,asset_id)
      VALUES(?,?,?,?,?,?,?,'pending','',NULL,?,?)`,
      id(),runId,point.id,point.title,label,point.lubricant,point.quantity_grams,point.position,point.asset_id);
    }
  });
  return runId;
}
export async function recordRoutePoint(
  itemId:string,status:RouteRunItem['status'],notes:string,lubricant:string,quantity:string,
  attachments:PhotoDraft[]=[]
):Promise<void> {
  const message=routeResult(status,notes),grams=appliedGrams(status,quantity);
  if(lubricant.length>200)throw new Error('Nome do lubrificante muito longo.');
  if(attachments.length>MAX_ROUTE_PHOTOS)throw new Error('Limite de 4 fotos por ponto.');
  const db=await getDatabase();
  const savedFiles:string[]=[];
  try {
    // Copie antes da transação: escrita de arquivos não é rollbackável no SQLite.
    for(const photo of attachments) savedFiles.push(await persistPhoto(photo));
    await db.withExclusiveTransactionAsync(async tx=>{
      const current=await tx.getFirstAsync<{run_id:string;finished_at:string|null;n:number}>(`
        SELECT i.run_id,r.finished_at,(SELECT COUNT(*) FROM route_run_photos p WHERE p.item_id=i.id) AS n
        FROM route_run_items i JOIN route_runs r ON r.id=i.run_id WHERE i.id=?`,itemId);
      if(!current || current.finished_at!==null)throw new Error('Ponto não encontrado ou rota já encerrada.');
      if(current.n+savedFiles.length>MAX_ROUTE_PHOTOS)throw new Error('Cada ponto permite até 4 fotos.');
      const changed=await tx.runAsync(`UPDATE route_run_items SET status=?,notes=?,lubricant=?,quantity_grams=?,recorded_at=?
        WHERE id=? AND EXISTS(SELECT 1 FROM route_runs r WHERE r.id=route_run_items.run_id AND r.finished_at IS NULL)`,
        status,message,lubricant.trim(),grams,new Date().toISOString(),itemId);
      if(changed.changes!==1)throw new Error('Ponto não encontrado ou rota já encerrada.');
      for(let i=0;i<savedFiles.length;i++) {
        await tx.runAsync('INSERT INTO route_run_photos(id,item_id,filename,mime_type,created_at) VALUES(?,?,?,?,?)',
          id(),itemId,savedFiles[i],attachments[i].mime_type,new Date().toISOString());
      }
    });
  } catch(error) {
    await Promise.allSettled(savedFiles.map(deletePhotoFile));
    throw error;
  }
}

export async function finishRouteRun(runId:string):Promise<void> {
  const db=await getDatabase();
  await db.withExclusiveTransactionAsync(async tx=>{
    const run=await tx.getFirstAsync<RouteRun>('SELECT * FROM route_runs WHERE id=?',runId);
    if(!run||run.finished_at!==null)throw new Error('Rota inexistente ou já finalizada.');
    const stats=await tx.getFirstAsync<{total:number;pending:number;anomaly:number;skipped:number}>(`
      SELECT COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END),0) AS pending,
        COALESCE(SUM(CASE WHEN status='anomaly' THEN 1 ELSE 0 END),0) AS anomaly,
        COALESCE(SUM(CASE WHEN status='skipped' THEN 1 ELSE 0 END),0) AS skipped
      FROM route_run_items WHERE run_id=?`,runId);
    if(!stats?.total)throw new Error('Execução sem pontos.');
    if(stats.pending)throw new Error(`Existem ${stats.pending} pontos sem registro. Conclua ou marque como não executados.`);
    const finishedAt=new Date().toISOString();
    const changed=await tx.runAsync('UPDATE route_runs SET finished_at=? WHERE id=? AND finished_at IS NULL',
      finishedAt,runId);
    if(changed.changes!==1)throw new Error('Esta rota já foi finalizada.');
    if(run.route_id) {
      const route=await tx.getFirstAsync<Route>('SELECT * FROM routes WHERE id=?',run.route_id);
      if(route) {
        const plan=planAfterRouteRun(route,stats.anomaly,stats.skipped,localDate());
        await tx.runAsync(`UPDATE routes SET next_due_date=?,attention_count=?,attention_at=?
          WHERE id=?`,plan.next_due_date,plan.attention_count,
          plan.attention_count?finishedAt:null,route.id);
      }
    }
  });
}
