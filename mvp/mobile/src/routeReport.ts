import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type {RouteRun,RouteRunItem} from './routes';
import {escapeHtml} from './report';

/** PDF consolidado é um retrato da execução, mesmo após alterações no cadastro. */
export async function exportRoutePdf(run:RouteRun,items:RouteRunItem[]):Promise<void>{
  if(!run.finished_at)throw new Error('Finalize a rota antes de emitir o relatório.');
  if(!items.length)throw new Error('Rota sem pontos registrados.');
  const esc=(v:string)=>escapeHtml(v||'—');
  const counts={
    done:items.filter(i=>i.status==='done').length,
    anomaly:items.filter(i=>i.status==='anomaly').length,
    skipped:items.filter(i=>i.status==='skipped').length,
  };
  const rows=items.map((i,index)=>`<tr>
    <td>${index+1}</td><td>${esc(i.point_title)}<small>${esc(i.asset_label)}</small></td>
    <td>${i.status==='done'?'Executado':i.status==='anomaly'?'Anomalia':i.status==='skipped'?'Não executado':'Pendente'}</td>
    <td>${esc(i.lubricant)}</td><td>${i.quantity_grams.toFixed(3)} g</td><td>${esc(i.notes)}</td>
    </tr>`).join('');
  const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
  <style>@page{margin:35px 24px}body{font-family:Arial,Helvetica,sans-serif;color:#18304c;font-size:11px}
    h1{font-size:20px;color:#176da8}h2{font-size:14px}.sub{color:#566;line-height:1.7}
    table{border-collapse:collapse;width:100%;table-layout:fixed}th,td{border:1px solid #d3dde9;padding:8px;vertical-align:top;overflow-wrap:break-word}
    th{background:#e9f2fc;text-align:left}small{display:block;margin-top:6px;color:#667}
    tr{page-break-inside:avoid}footer{font-size:9px;margin-top:25px;color:#666}
  </style></head><body>
  <h1>RotaManutenção — Relatório de rota</h1>
  <h2>${esc(run.route_title)}</h2>
  <p class="sub">Início: ${esc(new Date(run.started_at).toLocaleString('pt-BR'))}<br/>
  Término: ${esc(new Date(run.finished_at).toLocaleString('pt-BR'))}<br/>
  Resultado: ${counts.done} executado(s); ${counts.anomaly} anomalia(s); ${counts.skipped} não executado(s).</p>
  <table><thead><tr><th style="width:5%">#</th><th style="width:22%">Ponto / equipamento</th>
  <th style="width:14%">Resultado</th><th style="width:18%">Lubrificante</th>
  <th style="width:11%">Quantidade</th><th>Observação</th></tr></thead><tbody>${rows}</tbody></table>
  <footer>Registro feito localmente no aparelho. Não substitui a liberação, o bloqueio de energia ou os procedimentos de segurança da empresa.</footer>
  </body></html>`;
  const doc=await Print.printToFileAsync({html});
  if(!await Sharing.isAvailableAsync())throw new Error('Compartilhamento indisponível.');
  await Sharing.shareAsync(doc.uri,{mimeType:'application/pdf',dialogTitle:'Compartilhar relatório de rota'});
}
