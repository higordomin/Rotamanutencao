import type {MaintenanceNotice,NoticeKind} from './dailyNoticePlan.ts';

export type NotificationStyle='objetivo'|'detalhado';
export type NoticeAppearance={style:NotificationStyle;showTag:boolean};
export const DEFAULT_NOTICE_APPEARANCE:NoticeAppearance={style:'objetivo',showTag:true};
export const MAX_NOTICE_TITLE=90;
export const MAX_NOTICE_BODY=240;
export function validNoticeAppearance(value:unknown):value is NoticeAppearance{
  if(!value||typeof value!=='object')return false;
  const x=value as Partial<NoticeAppearance>;
  return (x.style==='objetivo'||x.style==='detalhado')&&typeof x.showTag==='boolean';
}
export function appearanceLabel(style:NotificationStyle):string{
  return style==='objetivo'?'Objetivo':'Detalhado';
}
function trim(value:string,n:number):string {
  const clean=value.replace(/\s+/g,' ').trim();
  return clean.length<=n?clean:clean.slice(0,n-1).trimEnd()+'…';
}
function tag(item:MaintenanceNotice,appearance:NoticeAppearance):string {
  return appearance.showTag&&item.assetCode?.trim()?
    `TAG ${trim(item.assetCode,30)}`:'';
}
/** Não inventa hora, status de execução ou TAG para rota multidisciplinar. */
export function formatPriorityNotification(
  item:MaintenanceNotice,kind:Exclude<NoticeKind,'daily'>,appearance:NoticeAppearance,
):{title:string;body:string}{
  if(!validNoticeAppearance(appearance))throw new Error('Preferências de aviso inválidas.');
  const subject=trim(item.title||'Manutenção sem título',60);
  const prefix=item.type==='route'?'Rota':'OS';
  const labels={attention:'Ocorrência',blocked:'Impedida',overdue:'Atrasada',high:'Prioridade alta'};
  const title=trim(`${prefix} • ${labels[kind]}: ${subject}`,MAX_NOTICE_TITLE);
  const due=item.dueDate?item.dueDate.split('-').reverse().join('/'):'';
  const detail=appearance.style==='detalhado';
  const tagText=tag(item,appearance);
  const status=kind==='attention'?
    `${Math.max(0,item.attentionCount??0)} ponto(s) com ocorrência. Confira a rota.`:
    kind==='blocked'?'Aguardando liberação. Confira o impedimento.':
    kind==='overdue'?'Prazo vencido. Verifique a programação.':
    'Atividade importante. Confira a programação.';
  const fields=[
    ...(tagText?[tagText]:[]),
    ...(detail&&item.type==='order'&&item.category?[trim(item.category,30)]:[]),
    ...(detail&&due?[`Prazo ${due}`]:[]),
    status,
  ];
  return {title,body:trim(fields.join(' · '),MAX_NOTICE_BODY)};
}
export function formatDailyNotification(
  digest:{orders:number;routes:number;overdue:number;blocked:number;anomalies:number;categories:string[]},
  appearance:NoticeAppearance,
):{title:string;body:string}{
  if(!validNoticeAppearance(appearance))throw new Error('Preferências de aviso inválidas.');
  const title='RotaManutenção • Agenda do dia';
  const scheduled=`${digest.orders} OS • ${digest.routes} rota(s)`;
  const alerts=[
    ...(digest.overdue?[`${digest.overdue} atrasada(s)`]:[]),
    ...(digest.blocked?[`${digest.blocked} impedida(s)`]:[]),
    ...(digest.anomalies?[`${digest.anomalies} rota(s) com ocorrência`]:[]),
  ];
  if(!digest.orders&&!digest.routes&&!alerts.length)
    return {title,body:'Sem OS ou rotas programadas para hoje.'};
  const extra=appearance.style==='detalhado'&&digest.categories.length?
    ` • ${digest.categories.join('; ')}`:'';
  return {title,body:trim(
    `${scheduled}${alerts.length?` • Atenção: ${alerts.join(', ')}`:''}${extra}`,
    MAX_NOTICE_BODY)};
}
