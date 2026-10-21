import {addDays,localDate,validDate} from './logic.ts';

export type RoutePlanningState='attention'|'overdue'|'today'|'upcoming'|'unscheduled';

export function parseRecurrence(value:string|number):number {
  const input=typeof value==='number'?value:Number(value.trim());
  if(!Number.isSafeInteger(input)||input<0||input>36500)
    throw new Error('Informe periodicidade inteira de 0 a 36500 dias.');
  if(typeof value==='string' && !/^\d+$/.test(value.trim()))
    throw new Error('Periodicidade deve conter apenas números inteiros.');
  return input;
}

/** Recorrência não configurada = avulsa; rota recorrente deve possuir primeira data. */
export function routePlanInput(recurrence:string|number,due:string|null):{
  recurrence_days:number;next_due_date:string|null
} {
  const days=parseRecurrence(recurrence);
  if(days===0)return {recurrence_days:0,next_due_date:null};
  if(!due||!validDate(due))throw new Error('Escolha uma data válida para a primeira execução.');
  return {recurrence_days:days,next_due_date:due};
}

export function routePlanningState(route:{
  recurrence_days:number;next_due_date:string|null;attention_count:number
},today=localDate()):RoutePlanningState {
  if(route.attention_count>0)return 'attention';
  if(!route.recurrence_days||!route.next_due_date)return 'unscheduled';
  if(route.next_due_date<today)return 'overdue';
  if(route.next_due_date===today)return 'today';
  return 'upcoming';
}

/** Não reagendar uma rota com anomalias ou pontos não executados.
 * Ela permanece com pendências mesmo se o prazo originalmente for futuro.
 */
export function planAfterRouteRun(route:{
  recurrence_days:number;next_due_date:string|null
},anomalies:number,skipped:number,finishedDay:string):{
  next_due_date:string|null;attention_count:number
} {
  if(!validDate(finishedDay))throw new Error('Data de término inválida.');
  const count=anomalies+skipped;
  if(!Number.isSafeInteger(anomalies)||anomalies<0||!Number.isSafeInteger(skipped)||skipped<0)
    throw new Error('Resultados da rota inválidos.');
  const recurrence=parseRecurrence(route.recurrence_days);
  if(count>0)return {next_due_date:route.next_due_date,attention_count:count};
  return {next_due_date:recurrence?addDays(finishedDay,recurrence):null,attention_count:0};
}
