import test from 'node:test';
import assert from 'node:assert/strict';
import {
  agendaAreas,agendaDayCounts,agendaPeriod,agendaSummary,agendaWindow,
  buildAgendaEntries,filterAgenda,shiftAgendaDate,weekRange,
} from '../src/operationalAgenda.ts';

const today='2026-10-22';
const orders=[
  {id:'overdue',title:'Lubrificar redutor',status:'pending',archived_at:null,
   due_date:'2026-10-19',priority:'Alta',asset_area:'Paletização',
   asset_code:'RD-100',asset_name:'Redutor',category:'Lubrificação',block_reason:'',partial_reason:''},
  {id:'blocked',title:'Aguardar peças',status:'pending',archived_at:null,
   due_date:'2026-10-22',priority:'Média',asset_area:'Utilidades',
   asset_code:'UM-1',asset_name:'Motor',category:'Mecânica',
   block_reason:'Falta rolamento',partial_reason:''},
  {id:'partial',title:'Revisão elétrica',status:'pending',archived_at:null,
   due_date:'2026-11-03',priority:'Alta',asset_area:'Utilidades',
   asset_code:'EL-2',asset_name:'Painel',category:'Elétrica',
   block_reason:'',partial_reason:'Aguardando teste'},
  {id:'today',title:'Inspeção visual',status:'pending',archived_at:null,
   due_date:'2026-10-22',priority:'Baixa',asset_area:'',
   asset_code:'',asset_name:'',category:'Inspeção',block_reason:'',partial_reason:''},
  {id:'far',title:'Troca filtro',status:'pending',archived_at:null,
   due_date:'2027-01-01',priority:'Média',asset_area:'Utilidades',
   asset_code:'FG-100',asset_name:'Filtro',category:'Mecânica',block_reason:'',partial_reason:''},
  {id:'completed',title:'Feita',status:'completed',archived_at:null,
   due_date:'2026-10-22',priority:'Baixa',asset_area:'',asset_code:'',
   asset_name:'',category:'Elétrica',block_reason:'',partial_reason:''},
  {id:'archived',title:'Arquivada',status:'pending',
   archived_at:'2026-10-21T00:00:00Z',due_date:'2026-10-22',priority:'Alta',
   asset_area:'',asset_code:'',asset_name:'',category:'Mecânica',block_reason:'',partial_reason:''},
];
const routes=[
  {id:'routeDue',title:'Rota esteiras',area:'Paletização',
    recurrence_days:30,next_due_date:'2026-10-23',attention_count:0},
  {id:'routeAttention',title:'Rota anomalia',area:'',
    recurrence_days:0,next_due_date:null,attention_count:1},
  {id:'routeRegular',title:'Rota avulsa normal',area:'',
    recurrence_days:0,next_due_date:null,attention_count:0},
  {id:'routeLate',title:'Rota vencida com anomalia',area:'Utilidades',
    recurrence_days:7,next_due_date:'2026-10-01',attention_count:2},
];
const entries=()=>buildAgendaEntries(orders,routes,today);
const ids=a=>a.map(x=>x.id);

test('agenda ignora OS concluída/arquivada, mantém OS futuras e rota com anomalia sem data',()=>{
  const items=entries();
  assert.equal(items.length,8);
  assert.ok(ids(items).includes('routeAttention'));
  assert.ok(ids(items).includes('far'));
  for(const excluded of ['completed','archived','routeRegular'])assert.ok(!ids(items).includes(excluded));
  assert.equal(items.find(x=>x.id==='routeAttention').dueDate,null);
  assert.equal(items.find(x=>x.id==='routeAttention').unscheduled,true);
  assert.equal(items.find(x=>x.id==='overdue').overdue,true);
});
test('pendências e bloqueios preservados, sem misturar com atividade concluída',()=>{
  const items=entries();
  assert.equal(items.find(x=>x.id==='partial').partial,true);
  assert.equal(items.find(x=>x.id==='partial').attention,true);
  assert.equal(items.find(x=>x.id==='blocked').blocked,true);
  assert.equal(items.find(x=>x.id==='routeLate').attention,true);
  const stats=agendaSummary(items,today);
  assert.deepEqual(stats,{total:8,orders:5,routes:3,overdue:2,today:2,attention:4,future:3});
});
test('filtro por tipo, área e especialidade não inventa especialidade da rota',()=>{
  const all=entries();
  assert.deepEqual(ids(filterAgenda(all,{type:'route',specialty:'Todas',area:'Paletização'})),['routeDue']);
  const lub=filterAgenda(all,{type:'all',specialty:'Lubrificação',area:''});
  assert.deepEqual(ids(lub),['overdue']);
  assert.equal(filterAgenda(all,{type:'route',specialty:'Elétrica',area:''}).length,0);
  assert.deepEqual(agendaAreas(all),['Paletização','Sem área','Utilidades']);
});
test('dia apresenta vencimentos exatos e backlog inclui pendências fora da data',()=>{
  const items=entries();
  const view=agendaWindow(items,today,'day');
  assert.deepEqual(ids(view.scheduled).sort(),['blocked','today']);
  assert.deepEqual(ids(view.backlog).sort(),['overdue','partial','routeAttention','routeLate'].sort());
  assert.ok(!ids(view.backlog).includes('far'));
  assert.ok(!ids(view.backlog).includes('routeDue'));
  assert.equal(new Set([...ids(view.scheduled),...ids(view.backlog)]).size,6);
});
test('semana começa segunda-feira e cruza ano corretamente',()=>{
  assert.deepEqual(weekRange('2026-10-22'),{
    start:'2026-10-19',end:'2026-10-25',
    dates:['2026-10-19','2026-10-20','2026-10-21','2026-10-22',
      '2026-10-23','2026-10-24','2026-10-25'],
  });
  const yearTurn=agendaPeriod('2027-01-01','week');
  assert.equal(yearTurn.start,'2026-12-28');
  assert.equal(yearTurn.end,'2027-01-03');
});
test('mês civil mantém fevereiro bissexto e mudança de ano',()=>{
  assert.deepEqual(agendaPeriod('2024-02-20','month'),{start:'2024-02-01',end:'2024-02-29'});
  assert.deepEqual(agendaPeriod('2026-12-31','month'),{start:'2026-12-01',end:'2026-12-31'});
  assert.equal(shiftAgendaDate('2026-12-31',1),'2027-01-01');
  assert.equal(shiftAgendaDate('2024-03-01',-1),'2024-02-29');
});
test('semana e mês não ocultam pendência sem data e não duplicam prazo na lista',()=>{
  const week=agendaWindow(entries(),'2026-10-22','week');
  assert.deepEqual(ids(week.scheduled).sort(),
    ['overdue','blocked','today','routeDue'].sort());
  assert.deepEqual(ids(week.backlog).sort(),['partial','routeAttention','routeLate'].sort());
  const month=agendaWindow(entries(),'2026-10-22','month');
  assert.equal(ids(month.scheduled).includes('routeLate'),true);
  assert.equal(ids(month.backlog).includes('routeLate'),false);
  assert.equal(ids(month.backlog).includes('routeAttention'),true);
});
test('contador por dia usa datas exatas e não gera projeções de recorrência',()=>{
  const c=agendaDayCounts(entries());
  assert.equal(c.get('2026-10-22'),2);
  assert.equal(c.get('2026-10-23'),1);
  assert.equal(c.get('2026-11-03'),1);
  assert.equal(c.get('2026-11-22'),undefined);
  assert.equal(c.has(''),false);
});
test('datas inválidas rejeitadas e agenda original preservada pelos filtros',()=>{
  assert.throws(()=>shiftAgendaDate('2026-02-30',1),/inválido/);
  assert.throws(()=>shiftAgendaDate(today,367),/inválido/);
  assert.throws(()=>agendaPeriod('2026-13-01','month'),/inválida/);
  assert.throws(()=>buildAgendaEntries([],[], '2026-02-30'),/inválida/);
  const arr=entries(),before=JSON.stringify(arr);
  filterAgenda(arr,{type:'order',specialty:'Todas',area:''});
  agendaWindow(arr,today,'month');
  assert.equal(JSON.stringify(arr),before);
});
