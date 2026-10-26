import type {RouteRun,RouteRunItem} from './routes';
import {pdfDate,pdfDocument,pdfEscape,pdfField,pdfPhotoFigures,type PdfPicture} from './professionalPdf.ts';

type RouteReportItem=Pick<RouteRunItem,'id'|'point_title'|'asset_label'|'status'|'notes'|'position'>;
type RouteReportRun=Pick<RouteRun,'id'|'route_title'|'started_at'|'finished_at'>;

function statusText(status:RouteRunItem['status']):string {
  return status==='done'?'Executado':status==='anomaly'?'Anomalia':
    status==='skipped'?'Não executado':'Pendente';
}
/** O PDF é um snapshot da execução finalizada, não da rota editável. */
export function buildRouteReportHtml(run:RouteReportRun,
  items:readonly RouteReportItem[],pictures:readonly PdfPicture[]=[]):string {
  if(!run.finished_at)throw new Error('Finalize a rota antes de emitir o relatório.');
  if(!items.length)throw new Error('Rota sem pontos registrados.');
  if(items.some(item=>item.status==='pending'))
    throw new Error('Uma rota finalizada não pode conter ponto sem registro.');
  const stats={
    done:items.filter(i=>i.status==='done').length,
    anomaly:items.filter(i=>i.status==='anomaly').length,
    skipped:items.filter(i=>i.status==='skipped').length,
  };
  const summary=`<div class="stats">
    <div class="stat"><strong>${items.length}</strong>Pontos</div>
    <div class="stat"><strong>${stats.done}</strong>Executados</div>
    <div class="stat"><strong>${stats.anomaly}</strong>Anomalias</div>
    <div class="stat"><strong>${stats.skipped}</strong>Não executados</div>
  </div>`;
  const rows=items.map((item,index)=>`<tr>
    <td>${index+1}</td>
    <td><strong>${pdfEscape(item.point_title)}</strong><small>${pdfEscape(item.asset_label)}</small></td>
    <td class="state ${item.status==='done'?'good':'warning'}">${statusText(item.status)}</td>
    <td>${pdfEscape(item.notes)}</td>
  </tr>`).join('');
  const fields=`<div class="fields">
    ${pdfField('Iniciada em',pdfDate(run.started_at))}
    ${pdfField('Finalizada em',pdfDate(run.finished_at))}
    ${pdfField('ID da execução',run.id)}
  </div>`;
  const photoHtml=pdfPhotoFigures(pictures);
  const body=`${fields}${summary}
    <h2>Registro dos pontos</h2>
    <table><thead><tr><th style="width:7%">Nº</th><th style="width:37%">Ponto e equipamento</th>
      <th style="width:18%">Resultado</th><th>Observação / ocorrência</th></tr></thead>
      <tbody>${rows}</tbody></table>
    <h2>Evidências fotográficas (${pictures.length})</h2>
    ${photoHtml||'<p class="meta">Nenhuma foto vinculada à execução.</p>'}`;
  return pdfDocument(run.route_title,'Rota de manutenção | Relatório de execução finalizada',body);
}
