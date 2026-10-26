import {addDays,localDate,taskState} from './logic.ts';
import type {WorkOrder} from './types';
import type {Route} from './routes';

export type BoardState='attention'|'blocked'|'overdue'|'today'|'upcoming';
export type BoardEntry={
  id:string;
  type:'order'|'route';
  title:string;
  subtitle:string;
  date:string|null;
  state:BoardState;
  priority:'Alta'|'Média'|'Baixa'|null;
  partial:boolean;
};
export type BoardResult={
  entries:BoardEntry[];
  counts:{attention:number;blocked:number;overdue:number;today:number;upcoming:number;orders:number;routes:number};
};
const severity:Record<BoardState,number>={attention:0,blocked:1,overdue:2,today:3,upcoming:4};
const priorityRank={'Alta':0,'Média':1,'Baixa':2};

/**
 * Painel operacional unifica OS e rotas pelo prazo e por impedimentos.
 * Sem leituras, escrita ou conectividade: recebe os dados do SQLite e calcula em memória.
 * Janela de sete dias evita esconder pendências antigas ou carregar OS futuras demais.
 */
export function buildOperationalBoard(
  orders:Pick<WorkOrder,'id'|'title'|'status'|'block_reason'|'partial_reason'|'due_date'|
    'priority'|'asset_code'|'asset_name'|'asset_area'|'category'>[],
  routes:Pick<Route,'id'|'title'|'area'|'next_due_date'|'attention_count'|'recurrence_days'>[],
  today=localDate(),
):BoardResult{
  const end=addDays(today,7);
  const entries:BoardEntry[]=[];
  for(const o of orders){
    if(o.status==='completed')continue;
    const kind=taskState(o,today);
    const state:BoardState=kind==='blocked'?'blocked'
      :kind==='overdue'?'overdue':kind==='today'?'today':'upcoming';
    if(state==='upcoming' && o.due_date>end)continue;
    const identification=[o.category,o.asset_code||o.asset_name||'',o.asset_area||'']
      .filter(Boolean).join(' · ');
    entries.push({type:'order',id:o.id,title:o.title,subtitle:identification,date:o.due_date,
      state,priority:o.priority,partial:!!o.partial_reason?.trim()});
  }
  for(const r of routes){
    const state:BoardState=r.attention_count>0?'attention'
      :r.recurrence_days<=0||!r.next_due_date?'upcoming'
      :r.next_due_date<today?'overdue':r.next_due_date===today?'today':'upcoming';
    // Não listar rotas avulsas regulares, mas manter as que têm anomalia.
    if(r.attention_count===0 && (r.recurrence_days===0 || !r.next_due_date))continue;
    if(state==='upcoming' && r.next_due_date && r.next_due_date>end)continue;
    entries.push({type:'route',id:r.id,title:r.title,subtitle:r.area||'Sem setor',
      date:r.next_due_date,state,priority:null,partial:false});
  }
  entries.sort((a,b)=>severity[a.state]-severity[b.state]
    ||(a.date??'9999').localeCompare(b.date??'9999')
    ||(priorityRank[a.priority??'Baixa']-priorityRank[b.priority??'Baixa'])
    ||a.title.localeCompare(b.title,'pt-BR')
    ||a.id.localeCompare(b.id));
  const counts={attention:0,blocked:0,overdue:0,today:0,upcoming:0,orders:0,routes:0};
  for(const entry of entries){counts[entry.state]+=1;counts[entry.type==='order'?'orders':'routes']+=1;}
  return {entries,counts};
}
