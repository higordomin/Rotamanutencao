import type {RouteRun,RouteRunItem,RouteRunPhoto} from './routes';
import {loadPdfPictures,printAndSharePdf} from './pdfEvidence';
import {buildRouteReportHtml} from './routeReportModel';

/** Emite um retrato imutável da execução, mesmo que a rota original mude. */
export async function exportRoutePdf(run:RouteRun,items:RouteRunItem[],photos:RouteRunPhoto[]=[]):Promise<void>{
  if(!run.finished_at)throw new Error('Finalize a rota antes de emitir o relatório.');
  if(!items.length)throw new Error('Rota sem pontos registrados.');
  const itemIndex=new Map(items.map(item=>[item.id,item]));
  const pictures=await loadPdfPictures(photos.map(photo=>{
    const item=itemIndex.get(photo.item_id);
    if(!item)throw new Error('A foto não corresponde a nenhum ponto desta execução.');
    return {filename:photo.filename,mime_type:photo.mime_type,
      caption:`${item.point_title} · ${item.asset_label||'Sem equipamento cadastrado'}`};
  }));
  const html=buildRouteReportHtml(run,items,pictures);
  await printAndSharePdf(html,'Compartilhar relatório de rota');
}
