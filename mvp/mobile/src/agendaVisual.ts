import type {AgendaEntry} from './operationalAgenda.ts';

/** O cartão principal lista poucos serviços, sem descartar os demais. */
export function agendaPreviewRows(items:readonly AgendaEntry[],expanded=false,maxVisible=5):AgendaEntry[]{
  if(!Number.isInteger(maxVisible)||maxVisible<1||maxVisible>100)
    throw new Error('Limite de atividades inválido.');
  return expanded?[...items]:items.slice(0,maxVisible);
}

export type AgendaVisualStatus='overdue'|'blocked'|'attention'|'today'|'scheduled';
export function agendaVisualStatus(entry:AgendaEntry):AgendaVisualStatus {
  if(entry.overdue)return 'overdue';
  if(entry.blocked)return 'blocked';
  if(entry.attention)return 'attention';
  if(entry.today)return 'today';
  return 'scheduled';
}
export function agendaVisualLabel(entry:AgendaEntry):string {
  const status=agendaVisualStatus(entry);
  if(status==='overdue')return 'Atrasada';
  if(status==='blocked')return 'Impedida';
  if(status==='attention')return entry.kind==='route'?'Anomalia':'Pendente de retorno';
  if(status==='today')return 'Hoje';
  return 'Programada';
}
