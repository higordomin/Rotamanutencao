import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAgendaEntries,filterAgenda} from '../src/operationalAgenda.ts';
import {buildShiftFocus,shiftFocusPreview} from '../src/shiftFocus.ts';

const day='2026-10-26';
const order=(id,title,due,priority='Média',extra={})=>({
 id,title,due_date:due,priority,status:'pending',archived_at:null,
 asset_area:'Linha A',asset_name:'Motor',asset_code:'EQ-1',category:'Mecânica',
 block_reason:'',partial_reason:'',...extra,
});
const route=(id,attention_count,next_due_date)=>({
 id,title:id,area:'Linha A',attention_count,next_due_date,recurrence_days:7,
});
const data=()=>{
 const orders=[
  order('late','Motor vencido','2026-10-20','Alta'),
  order('today','Inspeção hoje','2026-10-26','Baixa'),
  order('blocked','Aguardando bloqueio','2026-11-20','Média',{block_reason:'Sem acesso'}),
  order('partial','Reparo incompleto','2026-11-25','Baixa',{partial_reason:'Falta teste'}),
  order('highSoon','Alta prioridade futura','2026-10-31','Alta'),
  order('tomorrow','Não urgente amanhã','2026-10-27','Média'),
  order('later','Programada distante','2027-01-10','Alta'),
  order('archived','Arquivada','2026-10-20','Alta',{archived_at:'2026-10-20T00:00Z'}),
  order('done','Concluída','2026-10-26','Alta',{status:'completed'}),
 ];
 const routes=[route('attention',2,null),route('normal',0,'2026-10-31')];
 return buildAgendaEntries(orders,routes,day);
};
const ids=x=>x.map(r=>r.id);
test('turno inclui atrasos, hoje, impedimentos, parciais, alta próxima e anomalia sem prazo',()=>{
 const shift=buildShiftFocus(data(),day);
 assert.deepEqual(new Set(ids(shift.entries)),new Set([
  'late','today','blocked','partial','highSoon','attention']));
 assert.equal(shift.total,6);
 assert.equal(shift.overdue,1);
 assert.equal(shift.dueToday,1);
 assert.equal(shift.blocked,1);
 assert.equal(shift.highSoon,1);
 assert.equal(shift.attention,2);
});
test('não inclui OS concluída/arquivada ou tarefas normais futuras',()=>{
 const s=buildShiftFocus(data(),day);
 for(const id of ['done','archived','normal','tomorrow','later'])
  assert.ok(!ids(s.entries).includes(id),id);
});
test('impedimento + atraso + alerta no mesmo registro contam apenas uma entrada',()=>{
 const d=data();
 const item={...d[0],id:'same',attention:true,overdue:true,blocked:true};
 const result=buildShiftFocus([item,item],day);
 assert.equal(result.total,1);
 assert.equal(result.overdue,1);
 assert.equal(result.attention,1);
 assert.equal(result.blocked,1);
});
test('ação urgente precede alta programada, sem reordenar a agenda original',()=>{
 const d=data(),before=JSON.stringify(d);
 const s=buildShiftFocus(d,day);
 assert.equal(s.entries[0].id,'attention');
 assert.ok(ids(s.entries).indexOf('highSoon')>ids(s.entries).indexOf('today'));
 assert.equal(JSON.stringify(d),before);
});
test('filtros por setor ou especialidade continuam válidos no modo turno',()=>{
 const d=data();
 const el=filterAgenda(d,{type:'all',specialty:'Elétrica',area:''});
 assert.equal(buildShiftFocus(el,day).total,0);
 const routes=filterAgenda(d,{type:'route',specialty:'Todas',area:'Linha A'});
 assert.deepEqual(ids(buildShiftFocus(routes,day).entries),['attention']);
});
test('prévia não descarta silenciosamente os demais pontos de atenção',()=>{
 const s=buildShiftFocus(data(),day);
 assert.equal(shiftFocusPreview(s.entries,false,3).length,3);
 assert.equal(shiftFocusPreview(s.entries,true,3).length,s.total);
 assert.throws(()=>shiftFocusPreview(s.entries,false,0),/Limite/);
 assert.throws(()=>buildShiftFocus([], '2026-02-30'),/inválida/);
});
