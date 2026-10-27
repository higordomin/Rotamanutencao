import test from 'node:test';
import assert from 'node:assert/strict';
import {bottomTabs,moreDestinations,visibleTab,morePage} from '../src/navigation31.ts';
test('barra tem quatro destinos e não perde as páginas antigas',()=>{
 assert.deepEqual(bottomTabs.map(x=>x.label),['Início','Agenda','Atividades','Mais']);
 assert.deepEqual(moreDestinations.map(x=>x.label),['Ativos','Histórico','Dados']);
 assert.equal(new Set([...bottomTabs,...moreDestinations].map(x=>x.label)).size,7);
});
test('todas as telas secundárias permanecem sob Mais',()=>{
 for(const tab of ['Ativos','Histórico','Dados']){
  assert.equal(visibleTab(tab),'Mais');
  assert.equal(morePage(tab),true);
 }
 for(const tab of ['Início','Agenda','Atividades','Mais']){
  assert.equal(visibleTab(tab),tab);
  assert.equal(morePage(tab),false);
 }
});
