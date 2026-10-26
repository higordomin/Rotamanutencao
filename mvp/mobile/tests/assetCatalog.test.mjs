import test from 'node:test';
import assert from 'node:assert/strict';
import {assetSearchKey,assetAreas,findCatalogAssets,selectedCatalogAsset} from '../src/assetCatalog.ts';

const assets=Array.from({length:135},(_,i)=>({
  id:'a'+i,code:'EQ-'+String(i+1),name:i%2===0?'Esteira de inspeção':'Motor redutor',
  area:i%3===0?'Área de miúdos':i%3===1?'Paletização':'Utilidades'
}));
test('catálogo exibe 135 sem corte silencioso e ordena TAG numericamente',()=>{
  const rows=findCatalogAssets(assets);
  assert.equal(rows.length,135);
  assert.deepEqual(rows.slice(0,3).map(x=>x.code),['EQ-1','EQ-2','EQ-3']);
  assert.equal(rows.at(-1)?.code,'EQ-135');
});
test('busca por TAG, nome, setor e termos em ordem livre, sem acento',()=>{
  assert.equal(findCatalogAssets(assets,'  eQ-10 ')[0].code,'EQ-10');
  assert.ok(findCatalogAssets(assets,'INSPECAO MIUDOS').length>0);
  assert.ok(findCatalogAssets(assets,'paletizacao motor').length>0);
  assert.equal(assetSearchKey(' ÁREA   de   Miúdos '),'area de miudos');
});
test('filtro por área é exato e compatível com maiúsculas/acento',()=>{
  const rows=findCatalogAssets(assets,'','area de MIUDOS');
  assert.equal(rows.length,45);
  assert.ok(rows.every(item=>item.area==='Área de miúdos'));
  assert.deepEqual(assetAreas([...assets,{id:'extra',code:'',name:'',area:' área de miúdos '}]),
    ['Área de miúdos','Paletização','Utilidades']);
});
test('TAG parecida não faz seleção implícita; ID removido não troca de equipamento',()=>{
  const a=findCatalogAssets(assets,'EQ-1');
  assert.ok(a.length>1);
  assert.equal(selectedCatalogAsset(assets,'a0')?.code,'EQ-1');
  assert.equal(selectedCatalogAsset(assets,'excluido'),null);
  assert.equal(selectedCatalogAsset(assets,null),null);
});
test('ordem determinística e busca sem mutar lista original',()=>{
  const copy=[...assets].reverse();
  const ids=copy.map(x=>x.id);
  assert.deepEqual(findCatalogAssets(copy).map(x=>x.id),findCatalogAssets(assets).map(x=>x.id));
  assert.deepEqual(copy.map(x=>x.id),ids);
});
