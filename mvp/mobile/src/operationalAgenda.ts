import {localDate,validDate} from './logic.ts';
import type {Category,Priority,WorkOrder} from './types';
import type {Route} from './routes';

export type AgendaView='day'|'week'|'month';
export type AgendaType='all'|'order'|'route';
export type AgendaSpecialty='Todas'|Category;
export type AgendaEntry={
  kind:'order'|'route';id:string;title:string;area:string;subtitle:string;
  specialty:Category|null;priority:Priority|null;
  dueDate:string|null; attention:boolean;blocked:boolean;partial:boolean;
  overdue:boolean;today:boolean; unscheduled:boolean;
};
export type AgendaFilter={type:AgendaType;specialty:AgendaSpecialty;area:string};
export const NO_AREA='Sem área';

/** Agenda usa a data atualmente programada, nunca fabrica próximas recorrências. */
export function buildAgendaEntries(
  orders:ReadonlyArray<Pick<WorkOrder,'id'|'title'|'status'|'archived_at'|'due_date'|'priority'|
    'asset_area'|'asset_code'|'asset_name'|'category'|'block_reason'|'partial_reason'>>,
  routes:ReadonlyArray<Pick<Route,'id'|'title'|'area'|'next_due_date'|'recurrence_days'|'attention_count'>>,
  today=localDate(),
):AgendaEntry[]{
  if(!validDate(today))throw new Error('Data atual inválida.');
  const result:AgendaEntry[]=[];
  for(const o of orders){
    if(o.status!=='pending'||o.archived_at!==null)continue;
    const date=validDate(o.due_date)?o.due_date:null;
    const area=o.asset_area?.trim()||NO_AREA;
    result.push({
      kind:'order',id:o.id,title:o.title,area,subtitle:[o.category,
        o.asset_code||o.asset_name||'Sem equipamento'].filter(Boolean).join(' · '),
      specialty:o.category,priority:o.priority,dueDate:date,
      attention:!!o.partial_reason?.trim(),blocked:!!o.block_reason?.trim(),
      partial:!!o.partial_reason?.trim(),overdue:!!date&&date<today,today:date===today,
      unscheduled:!date,
    });
  }
  for(const r of routes){
    const recurring=r.recurrence_days>0;
    const due=recurring&&r.next_due_date&&validDate(r.next_due_date)?r.next_due_date:null;
    // Rota avulsa regular só é aberta na aba Rotas. Rotas com anomalia ficam no backlog.
    if(!due&&r.attention_count<=0)continue;
    result.push({
      kind:'route',id:r.id,title:r.title,area:r.area.trim()||NO_AREA,
      subtitle:recurring?'Rota recorrente':'Rota com ocorrência pendente',
      specialty:null,priority:null,dueDate:due,
      attention:r.attention_count>0,blocked:false,partial:false,
      overdue:!!due&&due<today,today:due===today,unscheduled:!due,
    });
  }
  return result.sort((a,b)=>{
    const rank=(x:AgendaEntry)=>x.attention?0:x.blocked?1:x.overdue?2:x.today?3:4;
    return rank(a)-rank(b)||(a.dueDate??'9999-12-31').localeCompare(b.dueDate??'9999-12-31')
      ||(a.priority==='Alta'?0:a.priority==='Média'?1:2)-
        (b.priority==='Alta'?0:b.priority==='Média'?1:2)
      ||a.title.localeCompare(b.title,'pt-BR')||a.id.localeCompare(b.id);
  });
}

export function agendaAreas(items:readonly AgendaEntry[]):string[]{
  return [...new Set(items.map(i=>i.area))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
}

export function filterAgenda(items:readonly AgendaEntry[],filter:AgendaFilter):AgendaEntry[]{
  return items.filter(item=>
    (filter.type==='all'||filter.type===item.kind)
    &&(filter.specialty==='Todas'||item.specialty===filter.specialty)
    &&(!filter.area||item.area===filter.area)
  );
}

export function shiftAgendaDate(date:string,days:number):string{
  if(!validDate(date)||!Number.isInteger(days)||Math.abs(days)>366)
    throw new Error('Deslocamento de data inválido.');
  const [year,month,day]=date.split('-').map(Number);
  const next=new Date(year,month-1,day,12);
  next.setDate(next.getDate()+days);
  const result=localDate(next);
  if(!validDate(result))throw new Error('Data fora dos limites permitidos.');
  return result;
}

export function weekRange(date:string):{start:string;end:string;dates:string[]}{
  if(!validDate(date))throw new Error('Data semanal inválida.');
  const [year,month,day]=date.split('-').map(Number);
  const mondayOffset=(new Date(year,month-1,day,12).getDay()+6)%7;
  const start=shiftAgendaDate(date,-mondayOffset);
  const dates=Array.from({length:7},(_,i)=>shiftAgendaDate(start,i));
  return {start,end:dates[6],dates};
}

export function agendaPeriod(date:string,view:AgendaView):{start:string;end:string}{
  if(!validDate(date))throw new Error('Data da agenda inválida.');
  if(view==='day')return {start:date,end:date};
  if(view==='week')return weekRange(date);
  const first=date.slice(0,7)+'-01';
  const [year,month]=first.split('-').map(Number);
  const last=localDate(new Date(year,month,0,12));
  return {start:first,end:last};
}

/** Backlog não desaparece ao navegar para uma semana/mês diferente. */
export function agendaWindow(
  items:readonly AgendaEntry[],date:string,view:AgendaView
):{scheduled:AgendaEntry[];backlog:AgendaEntry[]}{
  const {start,end}=agendaPeriod(date,view);
  const scheduled=items.filter(i=>!!i.dueDate && i.dueDate>=start&&i.dueDate<=end);
  const backlog=items.filter(i=>
    (i.attention||i.blocked||i.overdue||i.unscheduled)
    &&(!i.dueDate||i.dueDate<start||i.dueDate>end));
  return {scheduled,backlog};
}
export function agendaSummary(items:readonly AgendaEntry[],today=localDate()){
  return {
    total:items.length,orders:items.filter(i=>i.kind==='order').length,
    routes:items.filter(i=>i.kind==='route').length,
    overdue:items.filter(i=>!!i.dueDate&&i.dueDate<today).length,
    today:items.filter(i=>i.dueDate===today).length,
    attention:items.filter(i=>i.attention||i.blocked).length,
    future:items.filter(i=>!!i.dueDate&&i.dueDate>today).length,
  };
}
export function agendaDayCounts(items:readonly AgendaEntry[]):Map<string,number>{
  const counts=new Map<string,number>();
  for(const item of items)if(item.dueDate)counts.set(item.dueDate,(counts.get(item.dueDate)??0)+1);
  return counts;
}
