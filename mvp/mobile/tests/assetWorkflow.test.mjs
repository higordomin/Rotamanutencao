import test from 'node:test';
import assert from 'node:assert/strict';
import {searchAssets,preselectAsset,executionBelongsToAssetSnapshot} from '../src/assetWorkflow.ts';

const assets=[
  {id:'a1',code:'M-101',name:'Motor da esteira',area:'Área de miúdos'},
  {id:'a2',code:'M-1010',name:'Motor reserva',area:'Paletização'},
  {id:'a3',code:'BOM-12',name:'Bomba centrífuga',area:'Utilidades'},
];
test('busca por TAG exata ou parcial sem diferenciar acentos ou caixa',()=>{
  assert.deepEqual(searchAssets(assets,'m-101').map(a=>a.id),['a1','a2']);
  assert.deepEqual(searchAssets(assets,'MIUDOS').map(a=>a.id),['a1']);
  assert.deepEqual(searchAssets(assets,'  utilidades ').map(a=>a.id),['a3']);
  assert.equal(searchAssets(assets,'sem correspondência').length,0);
  assert.equal(searchAssets(assets,'').length,3);
});
test('nova OS já seleciona equipamento sem mudar o rascunho de origem',()=>{
  const draft={title:'',description:'',asset_id:null,recurrence_days:30};
  const result=preselectAsset(draft,assets[0]);
  assert.equal(result.asset_id,'a1');
  assert.equal(draft.asset_id,null);
  assert.deepEqual({...result,asset_id:null},draft);
  assert.throws(()=>preselectAsset(draft,{id:' '}),/inválido/);
});
test('histórico por equipamento compara retrato completo, nunca prefixos de TAG',()=>{
  const record={asset_label:'M-101 · Motor da esteira · Área de miúdos'};
  assert.equal(executionBelongsToAssetSnapshot(record,assets[0]),true);
  assert.equal(executionBelongsToAssetSnapshot(record,assets[1]),false);
  assert.equal(executionBelongsToAssetSnapshot({asset_label:''},assets[0]),false);
  assert.equal(executionBelongsToAssetSnapshot(record,{...assets[0],name:'Renomeado'}),false);
});
test('histórico por equipamento não muda registros nem vincula duas TAGs iguais com nomes distintos',()=>{
  const first={id:'b1',code:'T-25',name:'Esteira A',area:'Sala 1'};
  const other={id:'b2',code:'T-25',name:'Esteira B',area:'Sala 1'};
  const execution={asset_label:'T-25 · Esteira A · Sala 1'};
  assert.equal(executionBelongsToAssetSnapshot(execution,first),true);
  assert.equal(executionBelongsToAssetSnapshot(execution,other),false);
  assert.equal(execution.asset_label,'T-25 · Esteira A · Sala 1');
});
