import {addDays,localDate,validDate} from './logic.ts';
import {buildAgendaEntries,type AgendaEntry} from './operationalAgenda.ts';
import type {WorkOrder} from './types';
import type {Route} from './routes';

export type HomeOverview = {
  attention:number;
  today:number;
  upcoming:number;
  entries:AgendaEntry[];
  totalRelevant:number;
};

/**
 * Página inicial é um RESUMO, não um segundo calendário nem uma segunda lista de OS.
 * Os contadores são mutuamente exclusivos: cada OS/rota pertence a só uma faixa.
 * A lista é limitada a três itens e ordenada por atenção -> hoje -> sete dias.
 */
export function buildHomeOverview(
  orders:ReadonlyArray<Pick<WorkOrder,'id'|'title'|'status'|'archived_at'|'due_date'|
    'priority'|'sector'|'asset_area'|'asset_code'|'asset_name'|'category'|'block_reason'|'partial_reason'>>,
  routes:ReadonlyArray<Pick<Route,'id'|'title'|'area'|'next_due_date'|'recurrence_days'|'attention_count'>>,
  today=localDate(),
  limit=3,
):HomeOverview{
  if(!validDate(today))throw new Error('Data inválida para a página inicial.');
  if(!Number.isSafeInteger(limit)||limit<1||limit>10)throw new Error('Limite de destaques inválido.');
  const entries=buildAgendaEntries(orders,routes,today);
  const weekEnd=addDays(today,7);
  const attention:AgendaEntry[]=[];
  const current:AgendaEntry[]=[];
  const soon:AgendaEntry[]=[];
  for(const item of entries){
    if(item.attention||item.blocked||item.overdue){
      attention.push(item);
    }else if(item.dueDate===today){
      current.push(item);
    }else if(item.dueDate && item.dueDate>today && item.dueDate<=weekEnd){
      soon.push(item);
    }
  }
  const byDatePriority=(a:AgendaEntry,b:AgendaEntry)=>
    (a.dueDate??'9999-12-31').localeCompare(b.dueDate??'9999-12-31')
    ||(a.priority==='Alta'?0:a.priority==='Média'?1:2)-
      (b.priority==='Alta'?0:b.priority==='Média'?1:2)
    ||a.title.localeCompare(b.title,'pt-BR')||a.id.localeCompare(b.id);
  const urgentOrder=(entry:AgendaEntry)=>
    entry.overdue?0:entry.blocked?1:entry.attention?2:3;
  attention.sort((a,b)=>urgentOrder(a)-urgentOrder(b)||byDatePriority(a,b));
  current.sort(byDatePriority);
  soon.sort(byDatePriority);
  const highlighted=[...attention,...current,...soon];
  return {
    attention:attention.length,
    today:current.length,
    upcoming:soon.length,
    entries:highlighted.slice(0,limit),
    totalRelevant:highlighted.length,
  };
}

/** Uma só legenda por linha, sem repetir múltiplos badges no topo. */
export function homeEntryStatus(entry:AgendaEntry):string{
  if(entry.overdue&&entry.blocked)return 'Vencida e impedida';
  if(entry.overdue&&entry.attention)return 'Vencida · precisa retorno';
  if(entry.overdue)return 'Atrasada';
  if(entry.blocked)return 'Impedida';
  if(entry.attention)return entry.kind==='route'?'Ocorrência na rota':'Execução parcial';
  if(entry.today)return 'Para hoje';
  return 'Próxima';
}
