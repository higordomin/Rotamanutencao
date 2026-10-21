import test from 'node:test';
import assert from 'node:assert/strict';
import {searchAssets,preselectAsset,executionBelongsToAssetSnapshot,buildLegacyAssetIndex,inferLegacyAssetId,assetSnapshot} from '../src/assetWorkflow.ts';

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

test('execução com asset_id continua vinculada após alterar TAG, nome ou setor',()=>{
  const historical={asset_id:'a1',asset_label:'M-101 · Motor da esteira · Área de miúdos'};
  const renamed={...assets[0],code:'NOVO-01',name:'Motor substituído',area:'Nova linha'};
  assert.equal(executionBelongsToAssetSnapshot(historical,renamed),true);
  assert.equal(executionBelongsToAssetSnapshot(historical,assets[1]),false);
});
test('registro identificado por ID nunca muda de equipamento por coincidir texto',()=>{
  const record={asset_id:'a2',asset_label:assetSnapshot(assets[0])};
  assert.equal(executionBelongsToAssetSnapshot(record,assets[0]),false);
  assert.equal(executionBelongsToAssetSnapshot(record,assets[1]),true);
});
test('migração associa somente snapshots idênticos e sem conflito',()=>{
  const index=buildLegacyAssetIndex([...assets,{id:'duplicate',code:'M-101',name:'Motor da esteira',area:'Área de miúdos'}]);
  assert.equal(inferLegacyAssetId(assetSnapshot(assets[0]),index),null);
  assert.equal(inferLegacyAssetId(assetSnapshot(assets[1]),index),'a2');
  assert.equal(inferLegacyAssetId('M-10',index),null);
  assert.equal(inferLegacyAssetId('M-101 · Motor antigo · Área de miúdos',index),null);
});
test('histórico legado sem ID continua acessível por retrato sem fabricar vínculo',()=>{
  const legacy={asset_label:assetSnapshot(assets[0]),asset_id:null};
  assert.equal(executionBelongsToAssetSnapshot(legacy,assets[0]),true);
  assert.equal(executionBelongsToAssetSnapshot(legacy,{...assets[0],name:'Editado'}),false);
  assert.equal(inferLegacyAssetId(assetSnapshot(assets[0]),buildLegacyAssetIndex(assets)),'a1');
});
test('ativo excluído preserva ID do histórico, mas não faz correspondência textual com outra TAG',()=>{
  const record={asset_id:'id-excluido',asset_label:'TAG · Motor · Setor'};
  assert.equal(executionBelongsToAssetSnapshot(record,{id:'novo',code:'TAG',name:'Motor',area:'Setor'}),false);
  assert.equal(record.asset_id,'id-excluido');
});

test('visão por TAG não atribui registro legado ambíguo a dois cadastros iguais',()=>{
  const twin={id:'new',code:assets[0].code,name:assets[0].name,area:assets[0].area};
  const legacy={asset_id:null,asset_label:assetSnapshot(assets[0])};
  const ambiguousIndex=buildLegacyAssetIndex([assets[0],twin]);
  assert.equal(executionBelongsToAssetSnapshot(legacy,assets[0],ambiguousIndex),false);
  assert.equal(executionBelongsToAssetSnapshot(legacy,twin,ambiguousIndex),false);
  const uniqueIndex=buildLegacyAssetIndex(assets);
  assert.equal(executionBelongsToAssetSnapshot(legacy,assets[0],uniqueIndex),true);
  assert.equal(executionBelongsToAssetSnapshot({...legacy,asset_id:'a1'},assets[0],ambiguousIndex),true);
});
