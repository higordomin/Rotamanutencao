import {shiftAgendaDate,type AgendaEntry} from './operationalAgenda.ts';
import {validDate} from './logic.ts';

export type ShiftFocus={
  entries:AgendaEntry[];
  attention:number;
  overdue:number;
  dueToday:number;
  blocked:number;
  highSoon:number;
  total:number;
};
function sortPriority(priority:AgendaEntry['priority']):number {
  return priority==='Alta'?0:priority==='Média'?1:2;
}
/** A lista inclui só itens acionáveis agora e OS Alta nos próximos sete dias.
 * Uma mesma OS/rota aparece uma única vez, mesmo que esteja atrasada e impedida.
 * Não gera execução, horário de turno ou estimativas de tempo fictícias.
 */
export function buildShiftFocus(items:readonly AgendaEntry[],today:string):ShiftFocus {
  if(!validDate(today))throw new Error('Data de turno inválida.');
  const end=shiftAgendaDate(today,6);
  const selected=new Map<string,AgendaEntry>();
  for(const item of items){
    const due=item.dueDate;
    const highSoon=item.kind==='order'&&item.priority==='Alta'
      &&!!due&&due>today&&due<=end;
    const include=item.attention||item.blocked||item.partial||item.overdue||
      (!!due&&due===today)||highSoon;
    if(include)selected.set(item.kind+':'+item.id,item);
  }
  const entries=[...selected.values()].sort((a,b)=>{
    const rank=(x:AgendaEntry)=>x.attention?0:x.overdue?1:x.blocked?2:x.partial?3:
      x.dueDate===today?4:5;
    return rank(a)-rank(b)||sortPriority(a.priority)-sortPriority(b.priority)
      ||(a.dueDate??'9999-12-31').localeCompare(b.dueDate??'9999-12-31')
      ||a.title.localeCompare(b.title,'pt-BR')||a.id.localeCompare(b.id);
  });
  return {
    entries,total:entries.length,
    attention:entries.filter(x=>x.attention).length,
    overdue:entries.filter(x=>x.overdue).length,
    dueToday:entries.filter(x=>x.dueDate===today).length,
    blocked:entries.filter(x=>x.blocked).length,
    highSoon:entries.filter(x=>x.kind==='order'&&x.priority==='Alta'
      &&!!x.dueDate&&x.dueDate>today&&x.dueDate<=end).length,
  };
}
export function shiftFocusPreview(items:readonly AgendaEntry[],expanded=false,limit=8):AgendaEntry[]{
  if(!Number.isSafeInteger(limit)||limit<1||limit>100)
    throw new Error('Limite de pontos de atenção inválido.');
  return expanded?[...items]:items.slice(0,limit);
}
