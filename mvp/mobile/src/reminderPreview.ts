import type {WorkOrder} from './types';
import type {Route} from './routes';
import {planDailyAndPriority,type MaintenanceNotice,type PlannedNotice} from './dailyNoticePlan.ts';
import {DEFAULT_NOTICE_APPEARANCE,type NoticeAppearance} from './notificationContent.ts';

export type ReminderPreviewLine={
  key:string;kind:PlannedNotice['kind'];at:string;title:string;body:string;
};
/** Compartilhado por agendamento real e simulação, evitando diferenças de regra. */
export function noticeInputs(
  orders:ReadonlyArray<Pick<WorkOrder,
    'id'|'title'|'due_date'|'block_reason'|'status'|'priority'|'category'|'asset_code'>>,
  routes:ReadonlyArray<Pick<Route,'id'|'title'|'next_due_date'|'attention_count'>>,
):MaintenanceNotice[]{
  return [
    ...orders.map(o=>({id:o.id,type:'order' as const,title:o.title,
      dueDate:o.due_date,blocked:!!o.block_reason,completed:o.status==='completed',
      priority:o.priority,category:o.category,assetCode:o.asset_code})),
    ...routes.map(r=>({id:r.id,type:'route' as const,title:r.title,
      dueDate:r.next_due_date,attentionCount:r.attention_count,completed:false})),
  ];
}
/** Simulação de leitura — jamais chama o sistema de notificações ou grava no SQLite. */
export function previewPlannedReminders(
  inputs:readonly MaintenanceNotice[],now:Date,hour:number,minute:number,
  count=7,appearance:NoticeAppearance=DEFAULT_NOTICE_APPEARANCE,
):ReminderPreviewLine[]{
  if(!Number.isSafeInteger(count)||count<1||count>40)
    throw new Error('Limite de prévia inválido.');
  return planDailyAndPriority([...inputs],now,hour,minute,appearance)
    .sort((a,b)=>a.date.getTime()-b.date.getTime()||
      (a.kind==='daily'?1:0)-(b.kind==='daily'?1:0)||a.key.localeCompare(b.key))
    .slice(0,count)
    .map(item=>({key:item.key,kind:item.kind,at:item.date.toISOString(),
      title:item.title,body:item.body}));
}
