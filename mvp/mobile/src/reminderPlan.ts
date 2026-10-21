import {localDate,validDate} from './logic.ts';

export type ReminderInput={
  id:string;
  type:'order'|'route';
  title:string;
  dueDate:string|null;
  blocked?:boolean;
  attentionCount?:number;
  completed?:boolean;
};
export type ReminderCandidate={
  key:string;
  type:'order'|'route';
  title:string;
  kind:'attention'|'blocked'|'overdue'|'due'|'soon';
  date:Date;
};
export const MAX_REMINDERS=40;
export const REMINDER_HOURS=[8,14,19] as const;
export function isReminderHour(hour:number):boolean{
  return (REMINDER_HOURS as readonly number[]).includes(hour);
}
function atLocalHour(day:string,hour:number):Date{
  const [year,month,date]=day.split('-').map(Number);
  return new Date(year,month-1,date,hour,0,0,0);
}
function daysBetween(from:string,to:string):number {
  const a=from.split('-').map(Number), b=to.split('-').map(Number);
  return Math.round((Date.UTC(b[0],b[1]-1,b[2])-Date.UTC(a[0],a[1]-1,a[2]))/86400000);
}
function addOne(day:string):string {
  const parts=day.split('-').map(Number);
  const next=new Date(parts[0],parts[1]-1,parts[2]+1,12);
  return localDate(next);
}
/**
 * Lembretes individuais com horário configurável, sem serviço de rede nem polling:
 * agenda somente notificações pontuais para prazos conhecidos. Nunca simula
 * consulta em background a banco local.
 */
export function planReminders(items:ReminderInput[],now:Date,hour:number):ReminderCandidate[]{
  if(!isReminderHour(hour))throw new Error('Horário de lembrete não suportado.');
  const today=localDate(now);
  const tomorrow=addOne(today);
  const planned:ReminderCandidate[]=[];
  for(const item of items){
    if(item.completed)continue;
    const dueValid=!!item.dueDate&&validDate(item.dueDate);
    const late=dueValid?daysBetween(today,item.dueDate!):null;
    const pending=!!item.attentionCount||!!item.blocked;
    if(item.type==='route'&&!dueValid&&!pending)continue;
    if(!dueValid&&!pending)continue;
    // Só agenda itens próximos ou atrasados. Outros são agendados quando o app abrir.
    if(!pending&&late!==null&&late>45)continue;
    let kind:ReminderCandidate['kind'];
    if(item.attentionCount)kind='attention';
    else if(item.blocked)kind='blocked';
    else if(late!==null&&late<0)kind='overdue';
    else if(late===0)kind='due';
    else kind='soon';
    let date=atLocalHour(kind==='soon' ? item.dueDate! : today,hour);
    if(date.getTime()<=now.getTime()){
      date=atLocalHour(tomorrow,hour);
      if(!pending&&late===0)kind='overdue';
    }
    planned.push({key:item.type+':'+item.id,type:item.type,title:item.title.slice(0,120),kind,date});
  }
  // Atrasos/impedimentos antes das próximas. Em empate, mais próximo.
  const score={attention:0,blocked:1,overdue:2,due:3,soon:4};
  return planned.sort((a,b)=>score[a.kind]-score[b.kind]
    || a.date.getTime()-b.date.getTime()||a.key.localeCompare(b.key)).slice(0,MAX_REMINDERS);
}
