import type {Execution} from './types';

/**
 * "Concluídas" representa execuções finalizadas, não apenas o estado atual da OS.
 * Uma OS recorrente continua pendente após a conclusão porque tem nova data.
 * Nenhum registro parcial pode ser rotulado como concluído.
 */
export function filterCompletedExecutions<T extends Pick<Execution,
  'result'|'order_title'|'asset_label'|'category'|'notes'|'executed_at'|
  'previous_due_date'|'next_due_date'>>(
  executions:T[],search:string,
):T[]{
  const term=search.trim().toLocaleLowerCase('pt-BR');
  return executions.filter(execution=>{
    if(execution.result!=='completed')return false;
    if(!term)return true;
    const date=new Date(execution.executed_at);
    const displayDate=Number.isNaN(date.getTime())?'':date.toLocaleString('pt-BR');
    return [execution.order_title,execution.asset_label,execution.category,execution.notes,
      execution.executed_at,displayDate,execution.previous_due_date,execution.next_due_date??'']
      .some(value=>value.toLocaleLowerCase('pt-BR').includes(term));
  });
}
