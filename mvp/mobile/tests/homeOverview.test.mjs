import test from 'node:test';
import assert from 'node:assert/strict';
import {buildHomeOverview,homeEntryStatus} from '../src/homeOverview.ts';

const date='2026-10-22';
function order(id,dueDate,extra={}){
  return {id,title:'OS '+id,status:'pending',archived_at:null,due_date:dueDate,
    priority:'Média',asset_area:'Produção',asset_code:'TAG-'+id,asset_name:'Motor',
    category:'Lubrificação',block_reason:'',partial_reason:'',...extra};
}
function route(id,dueDate,extra={}){
  return {id,title:'Rota '+id,area:'Produção',recurrence_days:7,
    next_due_date:dueDate,attention_count:0,...extra};
}

test('resumo único não conta duas vezes OS atrasada e impedida',()=>{
  const orders=[
    order('old-blocked','2026-10-19',{block_reason:'Aguardando liberação'}),
    order('now','2026-10-22'),order('tomorrow','2026-10-23'),
    order('next-week','2026-10-29'),order('after-week','2026-10-30'),
  ];
  const data=buildHomeOverview(orders,[],date);
  assert.equal(data.attention,1);
  assert.equal(data.today,1);
  assert.equal(data.upcoming,2);
  assert.equal(data.totalRelevant,4);
  assert.deepEqual(data.entries.map(e=>e.id),['old-blocked','now','tomorrow']);
  assert.equal(homeEntryStatus(data.entries[0]),'Vencida e impedida');
});

test('prioridade por vencimento e atenção prevalece sobre OS para hoje',()=>{
  const items=buildHomeOverview([
    order('today','2026-10-22',{priority:'Alta'}),
    order('late','2026-10-10',{priority:'Baixa'}),
    order('partial-future','2026-11-30',{partial_reason:'Falta peça'}),
    order('blocked-now','2026-10-22',{block_reason:'Máquina operando'}),
  ],[route('anomaly',null,{recurrence_days:0,attention_count:1})],date);
  assert.equal(items.attention,4);
  assert.equal(items.today,1);
  assert.equal(items.upcoming,0);
  assert.equal(items.totalRelevant,5);
  assert.equal(items.entries[0].id,'late');
  assert.equal(items.entries[1].id,'blocked-now');
  assert.equal(items.entries[2].id,'partial-future');
});

test('indicadores agregam OS e rotas em conjuntos exclusivos',()=>{
  const data=buildHomeOverview([
    order('day','2026-10-22'),order('late','2026-10-21'),
    order('future','2026-10-26'),
    order('closed','2026-10-22',{status:'completed'}),
    order('archived','2026-10-22',{archived_at:'2026-10-01T10:00:00Z'}),
  ],[route('r-day','2026-10-22'),route('r-tomorrow','2026-10-23'),
     route('r-attention','2026-10-22',{attention_count:2})],date,5);
  assert.deepEqual({attention:data.attention,today:data.today,upcoming:data.upcoming},
    {attention:2,today:2,upcoming:2});
  assert.equal(new Set(data.entries.map(e=>e.kind+e.id)).size,data.entries.length);
  assert.equal(data.totalRelevant,6);
});

test('resumo vazio apresenta zero em todos os itens sem criar trabalho',()=>{
  const data=buildHomeOverview([],[],date);
  assert.deepEqual(data,{attention:0,today:0,upcoming:0,entries:[],totalRelevant:0});
});

test('não modifica dados e rejeita datas/limites inválidos',()=>{
  const orders=[order('x','2026-10-22')];
  const before=JSON.stringify(orders);
  buildHomeOverview(orders,[],date);
  assert.equal(JSON.stringify(orders),before);
  assert.throws(()=>buildHomeOverview(orders,[],'2026-02-30'),/inválida/);
  assert.throws(()=>buildHomeOverview(orders,[],date,11),/Limite/);
});

test('legenda curta diferencia rota com anomalia e OS parcial',()=>{
  const data=buildHomeOverview([order('partial','2026-10-24',{partial_reason:'Aguardando peça'})],
    [route('attention',null,{recurrence_days:0,attention_count:1})],date,5);
  assert.equal(homeEntryStatus(data.entries.find(x=>x.id==='attention')),'Ocorrência na rota');
  assert.equal(homeEntryStatus(data.entries.find(x=>x.id==='partial')),'Execução parcial');
});
