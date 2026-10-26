/** Identidade visual compartilhada pelos relatórios PDF gerados 100% no dispositivo. */
export type PdfPicture={
  mime_type:'image/jpeg'|'image/png';
  base64:string;
  caption:string;
};
export function pdfEscape(value:string|number|null|undefined):string {
  const text=String(value??'').trim()||'—';
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
export function pdfDate(value:string|null|undefined):string {
  if(!value)return '—';
  if(/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d=new Date(value+'T12:00:00Z');
    if(!Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value)
      return pdfEscape(value.slice(8,10)+'/'+value.slice(5,7)+'/'+value.slice(0,4));
  }
  const date=new Date(value);
  return Number.isNaN(date.getTime())?pdfEscape(value):pdfEscape(date.toLocaleString('pt-BR'));
}
const css=`
  @page{size:A4;margin:15mm 12mm 17mm}
  *{box-sizing:border-box}
  body{margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.48;color:#17283b}
  header{border-bottom:3px solid #1975ae;padding-bottom:12px;margin-bottom:16px}
  .brand{font-size:13px;font-weight:800;letter-spacing:.4px;color:#1975ae}
  h1{font-size:22px;line-height:1.2;color:#123958;margin:9px 0 7px}
  h2{font-size:14px;color:#145f92;margin:22px 0 9px;border-bottom:1px solid #cbd8e5;padding-bottom:5px}
  .meta{color:#5e7185;font-size:10px;margin:3px 0}
  .stats{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
  .stat{flex:1;min-width:90px;border:1px solid #ccdceb;background:#eef5fb;padding:10px 9px;border-radius:5px}
  .stat strong{display:block;font-size:20px;color:#135b8d}
  .summary{background:#f1f6fb;border-left:3px solid #1975ae;padding:11px 13px;white-space:pre-wrap;overflow-wrap:anywhere}
  .fields{display:flex;flex-wrap:wrap;gap:0 4%}
  .field{width:48%;border-bottom:1px solid #e2eaf1;padding:8px 0}
  .label{display:block;color:#65788d;font-size:9px;text-transform:uppercase;letter-spacing:.3px}
  .value{display:block;font-size:11px;font-weight:700;overflow-wrap:anywhere;margin-top:4px}
  table{border-collapse:collapse;width:100%;table-layout:fixed}
  thead{display:table-header-group}
  tr,figure{page-break-inside:avoid;break-inside:avoid}
  th,td{border:1px solid #dae4ed;padding:7px 8px;vertical-align:top;overflow-wrap:anywhere}
  th{text-align:left;background:#e8f2fa;font-size:9px;color:#123958}
  td small{display:block;color:#566d83;margin-top:3px}
  .state{font-weight:700}
  .warning{color:#a35917}.good{color:#117048}
  figure{margin:15px 0;text-align:center}
  figure img{max-width:100%;max-height:120mm;object-fit:contain}
  figcaption{margin:0 0 8px;font-size:10px;font-weight:700;overflow-wrap:anywhere}
  footer{margin-top:22px;padding-top:10px;border-top:1px solid #cbd8e5;color:#627184;font-size:9px;line-height:1.5}
`;
export function pdfDocument(title:string,subline:string,body:string):string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <style>${css}</style></head><body>
    <header><div class="brand">RotaManutenção | RELATÓRIO TÉCNICO</div>
    <h1>${pdfEscape(title)}</h1><p class="meta">${pdfEscape(subline)}</p></header>
    ${body}
    <footer>Documento elaborado a partir de registros manuais armazenados no aparelho.
    Não equivale à assinatura, aprovação do PCM, liberação de equipamento, LOTO
    ou atestado de execução. Confira os dados antes de compartilhar.
    </footer></body></html>`;
}
export function pdfField(label:string,value:string|null|undefined):string {
  return `<div class="field"><span class="label">${pdfEscape(label)}</span>
    <span class="value">${pdfEscape(value)}</span></div>`;
}
/** A foto é incluída apenas se MIME e dados locais forem válidos. */
export function pdfPhotoFigures(pictures:readonly PdfPicture[]):string {
  return pictures.map(photo=>{
    if(!['image/png','image/jpeg'].includes(photo.mime_type)
       ||!photo.base64||!/^[A-Za-z0-9+/]+={0,2}$/.test(photo.base64))
      throw new Error('Evidência fotográfica inválida para o PDF.');
    return `<figure><figcaption>${pdfEscape(photo.caption)}</figcaption>
      <img alt="Evidência de manutenção" src="data:${photo.mime_type};base64,${photo.base64}"/></figure>`;
  }).join('');
}
