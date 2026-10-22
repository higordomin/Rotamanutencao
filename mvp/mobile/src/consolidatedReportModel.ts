import {validDate} from './logic.ts';
import type {Execution, WorkOrder} from './types';
import type {RouteRun, RouteRunItem} from './routes';

export type ReportExecution = Pick<Execution,
  'id'|'order_title'|'result'|'executed_at'|'asset_label'|'category'|'notes'|'next_due_date'>;
export type ReportRouteItem = Pick<RouteRunItem,
  'id'|'run_id'|'point_title'|'asset_label'|'status'|'notes'>;
export type ReportPending = Pick<WorkOrder,
  'id'|'title'|'due_date'|'priority'|'block_reason'|'partial_reason'|'asset_name'|'asset_code'|'asset_area'>;
export type ReportPhoto = {
  owner_kind:'os'|'route';owner_id:string; mime_type:'image/jpeg'|'image/png';
  base64:string; caption:string;
};
export type ConsolidatedReportData = {
  start:string;end:string;generatedAt:string;
  executions:ReportExecution[];
  routeRuns:Pick<RouteRun,'id'|'route_title'|'started_at'|'finished_at'>[];
  routeItems:ReportRouteItem[];
  pendingOrders:ReportPending[];
  photos:ReportPhoto[];
  includedPhotos:boolean;
};

export const MAX_REPORT_DAYS=90;
export const MAX_REPORT_EXECUTIONS=200;
export const MAX_REPORT_ROUTE_ITEMS=300;
export const MAX_REPORT_PHOTOS=24;

export function validateReportPeriod(start:string,end:string):number{
  if(!validDate(start)||!validDate(end))throw new Error('Escolha datas válidas para o período.');
  const begin=Date.parse(start+'T00:00:00Z');
  const finish=Date.parse(end+'T00:00:00Z');
  const days=Math.round((finish-begin)/86400000)+1;
  if(days<=0)throw new Error('A data final não pode ser anterior à data inicial.');
  if(days>MAX_REPORT_DAYS)throw new Error('O período máximo do relatório é de 90 dias.');
  return days;
}

export function reportSummary(input:ConsolidatedReportData){
  const items=input.routeItems;
  return {
    osConcluidas:input.executions.filter(e=>e.result==='completed').length,
    osParciais:input.executions.filter(e=>e.result==='partial').length,
    rotasFinalizadas:input.routeRuns.length,
    pontosExecutados:items.filter(i=>i.status==='done').length,
    anomalias:items.filter(i=>i.status==='anomaly').length,
    pontosNaoExecutados:items.filter(i=>i.status==='skipped').length,
    pontosPendentes:items.filter(i=>i.status==='pending').length,
    pendenciasAtuais:input.pendingOrders.length,
    fotos:input.photos.length,
  };
}

function esc(s:string):string{
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function clean(s:string|null|undefined):string{return esc(s?.trim()||'—');}
function dateTime(s:string):string{
  const date=new Date(s);
  return Number.isNaN(date.getTime())?clean(s):esc(date.toLocaleString('pt-BR'));
}
function dateOnly(s:string):string{
  return validDate(s)?esc(s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4)):clean(s);
}
function resultLabel(s:ReportRouteItem['status']):string{
  return s==='done'?'Executado':s==='anomaly'?'Anomalia'
    :s==='skipped'?'Não executado':'Pendente';
}

/** Conteúdo HTML puro: testável offline e independente do motor de impressão. */
export function buildConsolidatedHtml(input:ConsolidatedReportData):string {
  validateReportPeriod(input.start,input.end);
  const summary=reportSummary(input);
  if(input.executions.length+input.routeRuns.length+input.pendingOrders.length===0)
    throw new Error('Não há registros neste período nem pendências atuais para apresentar.');
  if(input.executions.length>MAX_REPORT_EXECUTIONS||input.routeItems.length>MAX_REPORT_ROUTE_ITEMS)
    throw new Error('Muitos registros para um único PDF. Escolha um período menor.');
  if(input.photos.length>MAX_REPORT_PHOTOS)
    throw new Error('Muitas fotos no período. Escolha um período menor ou gere o PDF sem fotos.');
  if(!input.includedPhotos && input.photos.length)
    throw new Error('O relatório sem fotos não deve incluir anexos.');
  const executionRows=input.executions.map(e=>`<tr><td>${dateTime(e.executed_at)}</td>
    <td><b>${clean(e.order_title)}</b><br><small>${clean(e.asset_label)}</small></td>
    <td>${clean(e.category)}</td><td>${e.result==='partial'?'Parcial':'Concluída'}</td>
    <td>${clean(e.notes)}${e.result==='partial'?'<br><strong>OS permanece pendente</strong>':''}</td></tr>`).join('');
  const routeRows=input.routeRuns.map(run=>{
    const list=input.routeItems.filter(i=>i.run_id===run.id);
    const rows=list.map(item=>`<tr><td>${clean(item.point_title)}<br><small>${clean(item.asset_label)}</small></td>
      <td>${resultLabel(item.status)}</td>
      <td>${clean(item.notes)}</td></tr>`).join('');
    return `<section><h3>${clean(run.route_title)}</h3>
      <p class="meta">Finalizada: ${run.finished_at?dateTime(run.finished_at):'—'} · ${list.length} ponto(s)</p>
      <table><thead><tr><th>Ponto / equipamento</th><th>Resultado</th><th>Ocorrência</th></tr></thead>
      <tbody>${rows}</tbody></table></section>`;
  }).join('');
  const pendingRows=input.pendingOrders.map(o=>`<tr><td>${clean(o.title)}<br><small>${clean([o.asset_code,o.asset_name,o.asset_area].filter(Boolean).join(' · '))}</small></td>
    <td>${dateOnly(o.due_date)}</td><td>${clean(o.priority)}</td>
    <td>${clean([o.block_reason&&'Impedimento: '+o.block_reason,o.partial_reason&&'Parcial: '+o.partial_reason].filter(Boolean).join(' | ')||'Em atraso')}</td></tr>`).join('');
  const photoRows=input.photos.map(photo=>{
    if(!['image/jpeg','image/png'].includes(photo.mime_type) || !/^[A-Za-z0-9+/]*={0,2}$/.test(photo.base64))
      throw new Error('Imagem inválida para inclusão no PDF.');
    return `<figure><figcaption>${clean(photo.caption)}</figcaption>
      <img src="data:${photo.mime_type};base64,${photo.base64}" alt="Registro de manutenção"></figure>`;
  }).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
    @page{margin:38px 28px}body{font-family:Arial,Helvetica,sans-serif;color:#192e47;font-size:10px;line-height:1.45}
    header{border-bottom:3px solid #2481c1;padding-bottom:10px;margin-bottom:16px}
    h1{font-size:20px;color:#12689d;margin:0}h2{font-size:15px;color:#13689f;margin-top:20px}
    h3{font-size:12px;margin:16px 0 3px}.meta,small{color:#63758c}
    .note{font-size:10px;color:#4f6275;margin:7px 0 14px}
    .stats{display:flex;flex-wrap:wrap;gap:8px}.stat{background:#eaf3fa;border:1px solid #cce0f1;
      padding:8px 10px;border-radius:5px;min-width:92px}.stat strong{display:block;font-size:18px;color:#135a91}
    table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:9px}
    th,td{border:1px solid #d9e1ea;vertical-align:top;padding:6px;overflow-wrap:anywhere}
    th{background:#e6f0f8;text-align:left}tr,section,figure{page-break-inside:avoid}
    figure{text-align:center;margin:16px 0}figure img{max-width:100%;max-height:340px;object-fit:contain}
    figcaption{font-weight:bold;margin-bottom:7px}
    footer{border-top:1px solid #ddd;color:#697789;font-size:9px;margin-top:23px;padding-top:9px}
    </style></head><body>
    <header><h1>RotaManutenção · Relatório consolidado</h1>
    <p>Período de execução: ${dateOnly(input.start)} a ${dateOnly(input.end)}<br>
    Gerado em: ${dateTime(input.generatedAt)} · Gerado offline pelo próprio aparelho</p></header>
    <div class="stats">
      ${[['OS concluídas',summary.osConcluidas],['OS parciais',summary.osParciais],
        ['Rotas finalizadas',summary.rotasFinalizadas],['Pontos executados',summary.pontosExecutados],
        ['Anomalias',summary.anomalias],['Não executados',summary.pontosNaoExecutados],
        ['Pendências atuais',summary.pendenciasAtuais]].map(([label,value])=>`<div class="stat"><strong>${value}</strong>${label}</div>`).join('')}
    </div>
    <p class="note">OS filtradas pela data de execução e rotas pela data de finalização, no fuso local do aparelho.
    Pendências são um retrato do estado atual no momento da emissão e não representam o histórico de pendências do período.</p>
    <h2>Ordens de serviço executadas (${input.executions.length})</h2>
    ${input.executions.length?`<table><thead><tr><th>Quando</th><th>Atividade / equipamento</th><th>Tipo</th><th>Resultado</th><th>Observações</th></tr></thead><tbody>${executionRows}</tbody></table>`:
      '<p class="meta">Nenhuma OS executada no período.</p>'}
    <h2>Rotas finalizadas (${input.routeRuns.length})</h2>
    ${input.routeRuns.length?routeRows:'<p class="meta">Nenhuma rota finalizada no período.</p>'}
    <h2>Pendências atuais (${input.pendingOrders.length})</h2>
    ${input.pendingOrders.length?`<table><thead><tr><th>Atividade / equipamento</th><th>Prazo</th><th>Prioridade</th><th>Impedimento ou pendência</th></tr></thead><tbody>${pendingRows}</tbody></table>`:
      '<p class="meta">Nenhuma OS atrasada, impedida ou com execução parcial neste momento.</p>'}
    <h2>Evidências fotográficas</h2>
    ${!input.includedPhotos?'<p class="meta">Fotos não incluídas por escolha do usuário.</p>':
      photoRows||'<p class="meta">Nenhuma foto vinculada aos registros selecionados.</p>'}
    <footer>Relatório gerado a partir de registros manuais do dispositivo. Não substitui aprovação formal,
    liberação de energia ou procedimentos de segurança da empresa.</footer>
    </body></html>`;
}
