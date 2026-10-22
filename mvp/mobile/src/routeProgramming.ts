import {addDays,localDate,validDate} from './logic.ts';
import {routePlanInput,routePlanningState,type RoutePlanningState} from './routeSchedule.ts';

export const ROUTE_INTERVALS=[
  {days:0,label:'Avulsa'},
  {days:7,label:'7 dias'},
  {days:15,label:'15 dias'},
  {days:30,label:'30 dias'},
  {days:60,label:'60 dias'},
  {days:90,label:'90 dias'},
  {days:180,label:'180 dias'},
  {days:365,label:'365 dias'},
] as const;

/** Datas futuras desta prévia não são inseridas no SQLite nem na Agenda. */
export function previewRouteDates(recurrence:string|number,due:string|null,limit=3):string[]{
  const plan=routePlanInput(recurrence,due);
  if(!Number.isInteger(limit)||limit<1||limit>6)
    throw new Error('A prévia aceita de 1 a 6 datas.');
  if(plan.recurrence_days===0)return [];
  let next=plan.next_due_date!;
  const dates=[next];
  for(let i=1;i<limit;i++){
    next=addDays(next,plan.recurrence_days);
    dates.push(next);
  }
  return dates;
}
export function scheduleNeedsConfirmation(
  before:{recurrence_days:number;next_due_date:string|null;attention_count:number},
  after:{recurrence_days:number;next_due_date:string|null},
  today=localDate(),
):{needed:boolean;reason:'overdue'|'attention'|null}{
  if(!validDate(today))throw new Error('Data atual inválida.');
  const old=routePlanInput(before.recurrence_days,before.next_due_date);
  const target=routePlanInput(after.recurrence_days,after.next_due_date);
  const changed=old.recurrence_days!==target.recurrence_days||old.next_due_date!==target.next_due_date;
  if(!changed)return {needed:false,reason:null};
  if(before.attention_count>0)return {needed:true,reason:'attention'};
  if(routePlanningState({...before,next_due_date:old.next_due_date},today)==='overdue'
    &&(!target.next_due_date||target.next_due_date>old.next_due_date!))
    return {needed:true,reason:'overdue'};
  return {needed:false,reason:null};
}
export function routePlanningLabel(state:RoutePlanningState):string{
  return state==='attention'?'Com pendência':state==='overdue'?'Atrasada':
    state==='today'?'Para hoje':state==='upcoming'?'Programada':'Avulsa';
}
