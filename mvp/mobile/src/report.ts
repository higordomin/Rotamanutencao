import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {evidenceUri} from './evidence';
import type {Execution, ExecutionPhoto} from './types';

export function escapeHtml(raw: string): string {
  return raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export async function exportExecutionPdf(execution: Execution, photos: ExecutionPhoto[]): Promise<void> {
  const pictureHtml: string[] = [];
  for (const photo of photos) {
    const info = await FileSystem.getInfoAsync(evidenceUri(photo.filename));
    if (!info.exists || info.isDirectory) throw new Error('Uma foto do relatório está ausente.');
    const base64 = await FileSystem.readAsStringAsync(evidenceUri(photo.filename), {
      encoding: FileSystem.EncodingType.Base64,
    });
    pictureHtml.push(`<figure><img src="data:${photo.mime_type};base64,${base64}" alt="Evidência fotográfica" /></figure>`);
  }
  const field = (label: string, value: string) => `<div class="field"><small>${label}</small><div>${escapeHtml(value || '—')}</div></div>`;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" />
  <style>
  @page { margin: 42px 34px; }
  body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#14243A;background:white}
  header{border-bottom:3px solid #258ed1;padding-bottom:14px;margin-bottom:18px}
  .brand{font-weight:bold;color:#126aa4;font-size:20px;letter-spacing:.4px}
  h1{font-size:20px;margin:12px 0 4px}.sub{font-size:11px;color:#667}
  .grid{display:flex;flex-wrap:wrap}.field{width:45%;padding:10px 2%;border-bottom:1px solid #dfe7f1;box-sizing:border-box}
  small{color:#55718e;text-transform:uppercase;letter-spacing:.5px}
  .field div{margin-top:4px;font-weight:bold}h2{font-size:15px;color:#0a5a92;margin-top:25px}
  .notes{padding:14px;background:#f4f8fb;border-left:3px solid #258ed1;white-space:pre-wrap;overflow-wrap:break-word}
  figure{margin:12px 0 20px;page-break-inside:avoid;text-align:center}img{max-width:100%;max-height:380px;object-fit:contain}
  footer{margin-top:22px;color:#777;font-size:10px}
  </style></head><body><header><div class="brand">RotaManutenção</div><div class="sub">Registro técnico de execução · arquivo gerado localmente</div></header>
  <h1>${escapeHtml(execution.order_title)}</h1><div class="grid">
  ${field('Resultado', execution.result === 'partial' ? 'Execução parcial — pendência aberta' : 'Serviço concluído')}
  ${field('Executado em', new Date(execution.executed_at).toLocaleString('pt-BR'))}
  ${field('Equipamento / Área', execution.asset_label)}
  ${field('Especialidade', execution.category)}
  ${field('Data anterior', execution.previous_due_date)}
  ${field('Próxima execução', execution.result === 'partial' ? 'Sem reagendamento — OS permanece pendente' : (execution.next_due_date ?? 'Atividade avulsa'))}
  ${field('Identificador de execução', execution.id)}
  </div><h2>${execution.result === 'partial' ? 'Serviço parcial / pendências' : 'Serviço realizado / observações'}</h2><div class="notes">${escapeHtml(execution.notes || 'Sem observações')}</div>
  ${pictureHtml.length ? `<h2>Evidências fotográficas (${pictureHtml.length})</h2>${pictureHtml.join('')}` : ''}
  <footer>Documento gerado no dispositivo pelo RotaManutenção. As informações refletem o registro manual do usuário.</footer>
  </body></html>`;
  const pdf = await Print.printToFileAsync({html});
  if (!await Sharing.isAvailableAsync()) throw new Error('Compartilhamento indisponível neste aparelho.');
  await Sharing.shareAsync(pdf.uri, {mimeType:'application/pdf', dialogTitle:'Compartilhar relatório técnico'});
}
