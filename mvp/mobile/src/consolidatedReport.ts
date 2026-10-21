import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {getDatabase} from './db';
import {evidenceUri,MAX_PHOTO_BYTES} from './evidence';
import {localDate} from './logic';
import {
  buildConsolidatedHtml,MAX_REPORT_EXECUTIONS,MAX_REPORT_ROUTE_ITEMS,MAX_REPORT_PHOTOS,
  validateReportPeriod,
} from './consolidatedReportModel';
import type {ConsolidatedReportData,ReportExecution,ReportPending,ReportRouteItem,ReportPhoto} from './consolidatedReportModel';
import type {RouteRun} from './routes';

type ImageRow = {id:string;owner_id:string;filename:string;
  mime_type:'image/jpeg'|'image/png';caption:string;owner_kind:'os'|'route'};

/** Consulta local consistente: nunca usa somente a janela de 500 execuções da tela. */
async function readReportRows(start:string,end:string,includePhotos:boolean):Promise<{
  executions:ReportExecution[];routeRuns:RouteRun[];routeItems:ReportRouteItem[];
  pendingOrders:ReportPending[];photos:ImageRow[];
}> {
  const db=await getDatabase();
  const today=localDate();
  // Expo SQLite retorna Promise<void> neste método: preencher resultado dentro da transação.
  const output:{executions:ReportExecution[];routeRuns:RouteRun[];
    routeItems:ReportRouteItem[];pendingOrders:ReportPending[];photos:ImageRow[]}={
    executions:[],routeRuns:[],routeItems:[],pendingOrders:[],photos:[],
  };
  await db.withExclusiveTransactionAsync(async tx=>{
    const executions=await tx.getAllAsync<ReportExecution>(`
      SELECT id,order_title,result,executed_at,asset_label,category,notes,next_due_date
      FROM executions WHERE date(executed_at,'localtime') BETWEEN ? AND ?
      ORDER BY executed_at DESC,id LIMIT ?`,start,end,MAX_REPORT_EXECUTIONS+1);
    const routeRuns=await tx.getAllAsync<RouteRun>(`
      SELECT * FROM route_runs WHERE finished_at IS NOT NULL
      AND date(finished_at,'localtime') BETWEEN ? AND ?
      ORDER BY finished_at DESC,id LIMIT 101`,start,end);
    const routeItems=await tx.getAllAsync<ReportRouteItem>(`
      SELECT i.id,i.run_id,i.point_title,i.asset_label,i.status,i.notes,i.lubricant,i.quantity_grams
      FROM route_run_items i JOIN route_runs r ON r.id=i.run_id
      WHERE r.finished_at IS NOT NULL AND date(r.finished_at,'localtime') BETWEEN ? AND ?
      ORDER BY r.finished_at DESC,i.position,i.id LIMIT ?`,start,end,MAX_REPORT_ROUTE_ITEMS+1);
    const pendingOrders=await tx.getAllAsync<ReportPending>(`
      SELECT o.id,o.title,o.due_date,o.priority,o.block_reason,o.partial_reason,
      a.name AS asset_name,a.code AS asset_code,a.area AS asset_area
      FROM work_orders o LEFT JOIN assets a ON a.id=o.asset_id
      WHERE o.archived_at IS NULL AND o.status='pending'
      AND (o.block_reason!='' OR o.partial_reason!='' OR o.due_date<?)
      ORDER BY o.due_date,CASE o.priority WHEN 'Alta' THEN 0 WHEN 'Média' THEN 1 ELSE 2 END
      LIMIT 201`,today);
    let photos:ImageRow[]=[];
    if(includePhotos) {
      const orderImages=await tx.getAllAsync<Omit<ImageRow,'owner_kind'>>(`
        SELECT p.id,p.execution_id AS owner_id,p.filename,p.mime_type,e.order_title AS caption
        FROM execution_photos p JOIN executions e ON e.id=p.execution_id
        WHERE date(e.executed_at,'localtime') BETWEEN ? AND ?
        ORDER BY e.executed_at DESC,p.created_at,p.id LIMIT ?`,start,end,MAX_REPORT_PHOTOS+1);
      const routeImages=await tx.getAllAsync<Omit<ImageRow,'owner_kind'>>(`
        SELECT p.id,p.item_id AS owner_id,p.filename,p.mime_type,
        (r.route_title || ' · ' || i.point_title || ' · ' || i.asset_label) AS caption
        FROM route_run_photos p JOIN route_run_items i ON i.id=p.item_id
        JOIN route_runs r ON r.id=i.run_id
        WHERE r.finished_at IS NOT NULL AND date(r.finished_at,'localtime') BETWEEN ? AND ?
        ORDER BY r.finished_at DESC,p.created_at,p.id LIMIT ?`,start,end,MAX_REPORT_PHOTOS+1);
      photos=[
        ...orderImages.map(p=>({...p,owner_kind:'os' as const})),
        ...routeImages.map(p=>({...p,owner_kind:'route' as const})),
      ];
    }
    output.executions=executions;output.routeRuns=routeRuns;
    output.routeItems=routeItems;output.pendingOrders=pendingOrders;output.photos=photos;
  });
  return output;
}

/** Gera e compartilha, sob pedido explícito do usuário, sem alterar SQLite ou enviar para servidores. */
export async function exportConsolidatedPdf(start:string,end:string,includePhotos:boolean):Promise<void> {
  validateReportPeriod(start,end);
  const rows=await readReportRows(start,end,includePhotos);
  if(rows.executions.length>MAX_REPORT_EXECUTIONS||rows.routeRuns.length>100
    ||rows.routeItems.length>MAX_REPORT_ROUTE_ITEMS||rows.pendingOrders.length>200)
    throw new Error('Muitos registros neste relatório. Reduza o período ou resolva pendências atuais.');
  if(rows.photos.length>MAX_REPORT_PHOTOS)
    throw new Error('Mais de 24 fotos selecionadas. Reduza o período ou desmarque a opção de fotos.');
  const pictures:ReportPhoto[]=[];
  let totalBytes=0;
  if(includePhotos)for(const photo of rows.photos){
    const uri=evidenceUri(photo.filename);
    const info=await FileSystem.getInfoAsync(uri);
    if(!info.exists||info.isDirectory||typeof info.size!=='number'||info.size<=0||info.size>MAX_PHOTO_BYTES)
      throw new Error('Uma foto da manutenção está ausente ou maior que o limite de 5 MB. Gere sem fotos ou corrija o arquivo.');
    totalBytes+=info.size;
    if(totalBytes>16*1024*1024)
      throw new Error('As fotos ultrapassam 16 MB. Escolha um período menor ou desmarque as fotos.');
    pictures.push({
      owner_kind:photo.owner_kind,owner_id:photo.owner_id,caption:photo.caption,
      mime_type:photo.mime_type,
      base64:await FileSystem.readAsStringAsync(uri,{encoding:FileSystem.EncodingType.Base64}),
    });
  }
  const data:ConsolidatedReportData={
    start,end,generatedAt:new Date().toISOString(),executions:rows.executions,
    routeRuns:rows.routeRuns,routeItems:rows.routeItems,pendingOrders:rows.pendingOrders,
    photos:pictures,includedPhotos:includePhotos,
  };
  const html=buildConsolidatedHtml(data);
  if(!await Sharing.isAvailableAsync())throw new Error('Compartilhamento indisponível neste dispositivo.');
  const output=await Print.printToFileAsync({html});
  await Sharing.shareAsync(output.uri,{
    mimeType:'application/pdf',dialogTitle:'Compartilhar relatório consolidado de manutenção',
  });
}
