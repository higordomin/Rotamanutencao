import test from 'node:test';
import assert from 'node:assert/strict';
import {quickDoneDraft,routeProgress,visibleRouteItems} from '../src/quickRouteActions.ts';

const base={id:'route-point-1',status:'pending',recorded_at:null,
  lubricant:'NEVASTANE HD2T',quantity_grams:3.5};

test('um ponto pendente pode ser registrado com o lubrificante e a quantidade previstos',()=>{
  const before=structuredClone(base);
  const result=quickDoneDraft(base);
  assert.deepEqual(result,{
    id:'route-point-1',status:'done',notes:'',lubricant:'NEVASTANE HD2T',quantity:'3.5',
  });
  assert.deepEqual(base,before,'o rascunho rápido não altera o registro original');
});

test('o atalho nunca remarca ponto já salvo ou sem estado pendente',()=>{
  for(const status of ['done','anomaly','skipped']){
    assert.throws(()=>quickDoneDraft({...base,status}),/ainda pendentes/);
  }
  assert.throws(()=>quickDoneDraft({...base,recorded_at:'2026-10-22T10:00:00Z'}),/ainda pendentes/);
  assert.throws(()=>quickDoneDraft({...base,id:' '}),/inválido/);
});

test('quantidades inválidas não são convertidas em execução válida',()=>{
  for(const quantity_grams of [-1,100001,NaN,Infinity,3.1234]){
    assert.throws(()=>quickDoneDraft({...base,quantity_grams}),/Quantidade inválida/);
  }
  assert.throws(()=>quickDoneDraft({...base,lubricant:'x'.repeat(201)}),/excede o limite/);
  assert.equal(quickDoneDraft({...base,quantity_grams:0}).quantity,'0');
});

test('filtros exibem pendentes e ocorrências sem incluir pontos já executados',()=>{
  const items=[
    {id:'a',status:'pending'}, {id:'b',status:'done'},
    {id:'c',status:'anomaly'}, {id:'d',status:'skipped'},
    {id:'e',status:'pending'},
  ];
  assert.deepEqual(visibleRouteItems(items,'pending').map(i=>i.id),['a','e']);
  assert.deepEqual(visibleRouteItems(items,'attention').map(i=>i.id),['c','d']);
  assert.deepEqual(visibleRouteItems(items,'all').map(i=>i.id),items.map(i=>i.id));
  assert.deepEqual(routeProgress(items),{total:5,pending:2,attention:2,recorded:3});
  assert.equal(items[0].status,'pending');
});

test('conclusão da rota pode depender da contagem derivada, sem apagar pendências',()=>{
  const items=[{status:'done'},{status:'anomaly'},{status:'skipped'}];
  assert.equal(routeProgress(items).pending,0);
  assert.equal(routeProgress([{status:'done'},{status:'pending'}]).pending,1);
});
