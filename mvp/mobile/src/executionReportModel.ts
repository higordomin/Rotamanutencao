import type {Execution} from './types';
import {pdfDate,pdfDocument,pdfEscape,pdfField,pdfPhotoFigures,type PdfPicture} from './professionalPdf.ts';

type ExecutionInfo=Pick<Execution,'id'|'order_title'|'result'|'executed_at'|'asset_label'|
  'category'|'notes'|'previous_due_date'|'next_due_date'>;

/** Layout somente de leitura, testável sem Expo e independente do HTML do usuário. */
export function buildExecutionReportHtml(record:ExecutionInfo,pictures:readonly PdfPicture[]=[]):string {
  if(record.result!=='completed'&&record.result!=='partial')
    throw new Error('Resultado de OS inválido para relatório.');
  if(!record.id.trim())throw new Error('Execução sem identificador.');
  const result=record.result==='partial'?'Parcial — OS pendente':'Concluída';
  const date=pdfDate(record.executed_at);
  const due=pdfDate(record.previous_due_date);
  const next=record.result==='partial'?'Não reagendada — OS permanece pendente':
    record.next_due_date?pdfDate(record.next_due_date):'Atividade avulsa';
  const fields=[
    pdfField('Resultado',result),
    pdfField('Executado em',date),
    pdfField('TAG / Equipamento / Setor',record.asset_label),
    pdfField('Especialidade',record.category),
    pdfField('Prazo executado',due),
    pdfField('Próxima atividade',next),
    pdfField('ID imutável do registro',record.id),
  ].join('');
  const label=record.result==='partial'?'Serviço parcial e pendências':'Serviço realizado e observações';
  const photoHtml=pdfPhotoFigures(pictures);
  const body=`<div class="fields">${fields}</div>
    <h2>${label}</h2><div class="summary">${pdfEscape(record.notes||'Sem observações')}</div>
    ${record.result==='partial'?'<p class="state warning">A OS continua pendente; este documento não é comprovante de conclusão.</p>':''}
    <h2>Evidências fotográficas (${pictures.length})</h2>
    ${photoHtml||'<p class="meta">Nenhuma foto vinculada a este apontamento.</p>'}`;
  return pdfDocument(record.order_title,'Ordem de serviço | Relatório individual',body);
}
