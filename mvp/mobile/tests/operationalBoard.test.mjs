import test from 'node:test';
import assert from 'node:assert/strict';
import {buildOperationalBoard} from '../src/operationalBoard.ts';

function order(id,due_date,fields={}){
  return {id,title:'OS '+id,status:'pending',due_date,priority:'Média',
    category:'Lubrificação',asset_code:'EQ-01',asset_name:'Motor',asset_area:'Setor A',
    block_reason:'',partial_reason:'',...fields};
}
function route(id,next_due_date,fields={}){
  return {id,title:'Rota '+id,area:'Área',recurrence_days:30,
    attention_count:0,next_due_date,...fields};
}
const TODAY='2026-10-21';

test('lista pendências, bloqueios, atrasos e tarefas hoje acima das próximas',()=>{
  const b=buildOperationalBoard([
    order('normal','2026-10-24'),
    order('today','2026-10-21',{priority:'Alta'}),
    order('late','2026-10-20'),
    order('blocked','2026-10-30',{block_reason:'Aguardando liberação'}),
  ],[
    route('future','2026-10-25'),
    route('attention',null,{attention_count:2,recurrence_days:0}),
    route('late','2026-10-19'),
  ],TODAY);
  assert.deepEqual(b.entries.map(e=>e.state),[
    'attention','blocked','overdue','overdue','today','upcoming','upcoming'
  ]);
  assert.equal(b.counts.orders,4);
  assert.equal(b.counts.routes,3);
  assert.equal(b.counts.overdue,2);
});
test('OS concluída não aparece, rota avulsa regular não entra, mas avulsa com anomalia entra',()=>{
  const result=buildOperationalBoard([
    order('done','2026-10-21',{status:'completed'}),
  ],[
    route('avulsa',null,{recurrence_days:0}),
    route('avulsa pendente',null,{recurrence_days:0,attention_count:1}),
  ],TODAY);
  assert.equal(result.entries.length,1);
  assert.equal(result.entries[0].id,'avulsa pendente');
});
test('OS parcial continua pendente, TAG e setor aparecem',()=>{
  const result=buildOperationalBoard([
    order('partial','2026-10-21',{partial_reason:'Pendência no mancal'}),
  ],[],TODAY);
  assert.equal(result.entries[0].partial,true);
  assert.match(result.entries[0].subtitle,/EQ-01/);
});
test('itens futuros além de sete dias são omitidos, atrasados não são',()=>{
  const result=buildOperationalBoard([
    order('old','2026-01-01'),order('near','2026-10-28'),order('far','2026-11-01')
  ],[route('future','2026-12-01')],TODAY);
  assert.deepEqual(result.entries.map(e=>e.id),['old','near']);
});
test('rotas com pendência nunca desaparecem quando a data está muito distante',()=>{
  const result=buildOperationalBoard([],
    [route('anomaly','2027-02-12',{attention_count:4})],TODAY);
  assert.equal(result.entries.length,1);
  assert.equal(result.entries[0].state,'attention');
});
test('OS de alta prioridade vem antes de prioridade baixa na mesma data',()=>{
  const result=buildOperationalBoard([
    order('low','2026-10-21',{priority:'Baixa'}),
    order('high','2026-10-21',{priority:'Alta'})
  ],[],TODAY);
  assert.deepEqual(result.entries.map(e=>e.id),['high','low']);
});
test('dados usados são imutáveis e classificações não dependem de rede',()=>{
  const orders=[order('x','2026-10-21')];const routes=[route('y','2026-10-21')];
  const snapshot=JSON.stringify({orders,routes});
  buildOperationalBoard(orders,routes,TODAY);
  assert.equal(JSON.stringify({orders,routes}),snapshot);
});
