import {localDate,validDate} from './logic.ts';
import {validReminderTime} from './reminderPlan.ts';
import {formatDailyNotification,formatPriorityNotification,DEFAULT_NOTICE_APPEARANCE,
  type NoticeAppearance} from './notificationContent.ts';

export type MaintenanceNotice={
  id:string;
  type:'order'|'route';
  title:string;
  dueDate:string|null;
  completed?:boolean;
  blocked?:boolean;
  attentionCount?:number;
  priority?:'Alta'|'Média'|'Baixa';
  category?:string;
  assetCode?:string|null;
};
export type NoticeKind='daily'|'attention'|'blocked'|'overdue'|'high';
export type PlannedNotice={
  key:string;
  kind:NoticeKind;
  title:string;
  body:string;
  date:Date;
  target?:'order'|'route';
};
export const DIGEST_DAYS=7;
export const MAX_LOCAL_NOTICES=40;

function parseDay(day:string):[number,number,number]{
  const parts=day.split('-').map(Number);
  return [parts[0],parts[1],parts[2]];
}
function dayAt(day:string,hour:number,minute:number):Date{
  const [year,month,date]=parseDay(day);
  return new Date(year,month-1,date,hour,minute,0,0);
}
function addCalendarDays(day:string,count:number):string{
  const [y,m,d]=parseDay(day);
  return localDate(new Date(y,m-1,d+count,12,0,0,0));
}
function plural(n:number,one:string,many:string):string{
  return n===1?`${n} ${one}`:`${n} ${many}`;
}
function dateLabel(day:string):string{
  const [y,m,d]=parseDay(day);
  return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
}
export function buildDailyDigest(items:MaintenanceNotice[],day:string):{
  orders:number;routes:number;overdue:number;blocked:number;anomalies:number;
  categories:string[];title:string;body:string;
}{
  if(!validDate(day))throw new Error('Data do resumo inválida.');
  const open=items.filter(x=>!x.completed);
  const due=open.filter(x=>x.dueDate===day);
  const orders=due.filter(x=>x.type==='order');
  const routes=due.filter(x=>x.type==='route');
  const overdue=open.filter(x=>x.dueDate && x.dueDate<day).length;
  const blocked=open.filter(x=>x.type==='order'&&x.blocked).length;
  const anomalies=open.filter(x=>x.type==='route'&&(x.attentionCount??0)>0).length;
  const countByCategory=new Map<string,number>();
  for(const order of orders){
    const cat=order.category?.trim()||'Outras';
    countByCategory.set(cat,(countByCategory.get(cat)??0)+1);
  }
  const categories=[...countByCategory.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
    .map(([name,n])=>`${name}: ${n}`);
  const basic=`${plural(orders.length,'OS','OS')} e ${plural(routes.length,'rota','rotas')} programadas para hoje`;
  const alerts=[
    ...(overdue?[plural(overdue,'atrasada','atrasadas')]:[]),
    ...(blocked?[plural(blocked,'impedida','impedidas')]:[]),
    ...(anomalies?[plural(anomalies,'rota com anomalias','rotas com anomalias')]:[]),
  ];
  const chunks=[basic+'.'];
  if(categories.length)chunks.push(categories.join('; ')+'.');
  if(alerts.length)chunks.push('Atenção: '+alerts.join(', ')+'.');
  if(!due.length&&!alerts.length)chunks.splice(0,1,'Nenhuma OS ou rota programada para hoje.');
  return {orders:orders.length,routes:routes.length,overdue,blocked,anomalies,
    categories,title:'RotaManutenção • Programação de hoje',body:chunks.join(' ').slice(0,450)};
}
function criticalKind(item:MaintenanceNotice,day:string):NoticeKind|null{
  if(item.type==='route'&&(item.attentionCount??0)>0)return 'attention';
  if(item.type==='order'&&item.blocked)return 'blocked';
  if(item.dueDate && item.dueDate<day)return 'overdue';
  if(item.type==='order'&&item.priority==='Alta'&&item.dueDate&&item.dueDate>=day)
    return 'high';
  return null;
}
/** Agenda um resumo por dia para a próxima semana e avisos individuais apenas para
 * pendências, impedimentos, atrasos e OS de prioridade Alta.
 * O texto do resumo é um retrato da base na última abertura/sincronização.
 */
export function planDailyAndPriority(
  items:MaintenanceNotice[],now:Date,hour:number,minute:number,
  appearance:NoticeAppearance=DEFAULT_NOTICE_APPEARANCE,
):PlannedNotice[]{
  if(!validReminderTime(hour,minute)||Number.isNaN(now.getTime()))
    throw new Error('Horário ou data inválidos.');
  const today=localDate(now);
  const firstDay=dayAt(today,hour,minute).getTime()>now.getTime()?today:addCalendarDays(today,1);
  const summaries:PlannedNotice[]=[];
  for(let i=0;i<DIGEST_DAYS;i++){
    const day=addCalendarDays(firstDay,i);
    const digest=buildDailyDigest(items,day);
    const content=formatDailyNotification(digest,appearance);
    summaries.push({key:`daily:${day}`,kind:'daily',title:content.title,body:content.body,date:dayAt(day,hour,minute)});
  }

  const critical:PlannedNotice[]=[];
  for(const item of items){
    if(item.completed)continue;
    const kind=criticalKind(item,firstDay);
    if(!kind)continue;
    // Alta prioridade futura: lembrar na data do vencimento, dentro do horizonte.
    const targetDay=kind==='high'&&item.dueDate && item.dueDate>firstDay
      ?item.dueDate:firstDay;
    if(targetDay>addCalendarDays(firstDay,DIGEST_DAYS-1))continue;
    // Não acrescenta dois minutos artificiais: mesmo horário solicitado para
    // os avisos críticos, sem disparo retroativo quando o horário já passou.
    const at=dayAt(targetDay,hour,minute);
    const scheduled=at.getTime()>now.getTime()?at:
      dayAt(addCalendarDays(targetDay,1),hour,minute);
    const content=formatPriorityNotification(item,kind,appearance);
    critical.push({key:`priority:${item.type}:${item.id}`,kind,
      target:item.type,title:content.title,body:content.body,date:scheduled});
  }
  const weight={attention:0,blocked:1,overdue:2,high:3,daily:4};
  const criticalSorted=critical.sort((a,b)=>weight[a.kind]-weight[b.kind]||
    a.date.getTime()-b.date.getTime()||a.key.localeCompare(b.key));
  // Resumos são reservados antes de limitar os avisos individuais.
  return [...summaries,...criticalSorted.slice(0,MAX_LOCAL_NOTICES-summaries.length)];
}
