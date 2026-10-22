import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import {evidenceUri,MAX_PHOTO_BYTES} from './evidence';
import * as Sharing from 'expo-sharing';
import type {RouteRun,RouteRunItem,RouteRunPhoto} from './routes';
import {escapeHtml} from './report';

/** PDF consolidado é um retrato da execução, mesmo após alterações no cadastro. */
export async function exportRoutePdf(run:RouteRun,items:RouteRunItem[],photos:RouteRunPhoto[]=[]):Promise<void>{
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
    <td>${esc(i.notes)}</td>
    </tr>`).join('');
  const photoBlocks:string[]=[];
  let photoTotalBytes=0;
  const itemMap=new Map(items.map(i=>[i.id,i]));
  for(const photo of photos) {
    const item=itemMap.get(photo.item_id);
    if(!item)throw new Error('Foto vinculada a ponto inexistente.');
    const uri=evidenceUri(photo.filename);
    const info=await FileSystem.getInfoAsync(uri);
    if(!info.exists||info.isDirectory||typeof info.size!=='number'||info.size>MAX_PHOTO_BYTES)
      throw new Error('Foto do ponto ausente ou muito grande para o PDF.');
    photoTotalBytes+=info.size;
    if(photoTotalBytes>16*1024*1024)
      throw new Error('As fotos desta rota ultrapassam 16 MB. Divida o relatório para evitar falha de memória.');
    const base64=await FileSystem.readAsStringAsync(uri,{encoding:FileSystem.EncodingType.Base64});
    photoBlocks.push(`<figure><figcaption>${esc(item.point_title)} — ${esc(item.asset_label)}</figcaption>
      <img src="data:${photo.mime_type};base64,${base64}" alt="Foto de evidência do ponto" /></figure>`);
  }
  const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
  <style>@page{margin:35px 24px}body{font-family:Arial,Helvetica,sans-serif;color:#18304c;font-size:11px}
    h1{font-size:20px;color:#176da8}h2{font-size:14px}.sub{color:#566;line-height:1.7}
    table{border-collapse:collapse;width:100%;table-layout:fixed}th,td{border:1px solid #d3dde9;padding:8px;vertical-align:top;overflow-wrap:break-word}
    th{background:#e9f2fc;text-align:left}small{display:block;margin-top:6px;color:#667}
    tr{page-break-inside:avoid}figure{page-break-inside:avoid;margin:15px 0;text-align:center}
    figure img{max-width:100%;max-height:400px;object-fit:contain}
    figcaption{font-weight:bold;margin-bottom:8px}footer{font-size:9px;margin-top:25px;color:#666}
  </style></head><body>
  <h1>RotaManutenção — Relatório de rota</h1>
  <h2>${esc(run.route_title)}</h2>
  <p class="sub">Início: ${esc(new Date(run.started_at).toLocaleString('pt-BR'))}<br/>
  Término: ${esc(new Date(run.finished_at).toLocaleString('pt-BR'))}<br/>
  Resultado: ${counts.done} executado(s); ${counts.anomaly} anomalia(s); ${counts.skipped} não executado(s).</p>
  <table><thead><tr><th style="width:5%">#</th><th style="width:22%">Ponto / equipamento</th>
  <th style="width:17%">Resultado</th><th>Observação</th></tr></thead><tbody>${rows}</tbody></table>
  ${photoBlocks.length?`<h2>Fotografias dos pontos (${photoBlocks.length})</h2>${photoBlocks.join('')}`:''}
  <footer>Registro feito localmente no aparelho. Não substitui a liberação, o bloqueio de energia ou os procedimentos de segurança da empresa.</footer>
  </body></html>`;
  const doc=await Print.printToFileAsync({html});
  if(!await Sharing.isAvailableAsync())throw new Error('Compartilhamento indisponível.');
  await Sharing.shareAsync(doc.uri,{mimeType:'application/pdf',dialogTitle:'Compartilhar relatório de rota'});
}
