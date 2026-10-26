import {loadPdfPictures,printAndSharePdf} from './pdfEvidence';
import {buildExecutionReportHtml} from './executionReportModel';
import {pdfEscape} from './professionalPdf';
import type {Execution,ExecutionPhoto} from './types';

// Mantido para consumidores legados; textos do PDF passam pelo escape compartilhado.
export const escapeHtml=pdfEscape;

/** Relatório individual, completo e sem acesso à rede ou alteração de registros. */
export async function exportExecutionPdf(execution:Execution,photos:ExecutionPhoto[]):Promise<void> {
  const pictures=await loadPdfPictures(photos.map((p,index)=>({
    filename:p.filename,mime_type:p.mime_type,
    caption:`Evidência ${index+1} · ${execution.asset_label||execution.order_title}`,
  })));
  const html=buildExecutionReportHtml(execution,pictures);
  await printAndSharePdf(html,'Compartilhar relatório de ordem de serviço');
}
