import test from 'node:test';
import assert from 'node:assert/strict';
import {reorderedPointIds,copyRouteTitle} from '../src/routeEditor.ts';
import fs from 'node:fs';

test('setas sobem e descem só um ponto, preservando os outros e o array original',()=>{
  const input=Object.freeze(['a','b','c','d']);
  assert.deepEqual(reorderedPointIds(input,'b','up'),['b','a','c','d']);
  assert.deepEqual(reorderedPointIds(input,'b','down'),['a','c','b','d']);
  assert.deepEqual(input,['a','b','c','d']);
});
test('setas nas extremidades não removem nem duplicam pontos',()=>{
  const input=['a','b','c'];
  assert.deepEqual(reorderedPointIds(input,'a','up'),input);
  assert.deepEqual(reorderedPointIds(input,'c','down'),input);
  assert.deepEqual(reorderedPointIds(['only'],'only','up'),['only']);
});
test('ID estranho, direção inválida e lista corrompida são rejeitados',()=>{
  assert.throws(()=>reorderedPointIds(['a','b'],'outside','down'),/não pertence/);
  assert.throws(()=>reorderedPointIds(['a','b'],'a','left'),/Direção/);
  assert.throws(()=>reorderedPointIds(['a','a'],'a','up'),/Lista/);
  assert.throws(()=>reorderedPointIds([''],'','up'),/Lista/);
  assert.throws(()=>reorderedPointIds(Array.from({length:101},(_,i)=>'p'+i),'p1','up'),/Lista/);
});
test('ordenação repetida normaliza a sequência em etapas, sem alterar os IDs',()=>{
  const a=['a','b','c','d'];
  const b=reorderedPointIds(a,'d','up');
  const c=reorderedPointIds(b,'d','up');
  const d=reorderedPointIds(c,'d','up');
  assert.deepEqual(d,['d','a','b','c']);
  assert.deepEqual([...d].sort(),[...a].sort());
});
test('duplicar como modelo usa nome seguro, inclusive nomes longos',()=>{
  assert.equal(copyRouteTitle(' Inspeção de segurança '),'Cópia de Inspeção de segurança');
  assert.equal(copyRouteTitle('R'.repeat(200)).length,200);
  assert.throws(()=>copyRouteTitle('  '),/Nome/);
});
test('operações ficam dentro de transação e não alteram histórico de execuções',()=>{
  const src=fs.readFileSync(new URL('../src/routes.ts',import.meta.url),'utf8');
  for(const fn of ['updateRoutePoint','changeRoutePointOrder','duplicateRouteAsTemplate']){
    const block=src.slice(src.indexOf('export async function '+fn));
    assert.ok(block.includes('db.withExclusiveTransactionAsync'),fn);
    assert.ok(block.includes('route_points'),fn);
  }
  assert.ok(src.includes("SELECT id FROM route_runs WHERE route_id=? AND finished_at IS NULL LIMIT 1"));
  assert.ok(src.includes("VALUES(?,?,?,?,0,NULL,0,NULL)"));
  assert.ok(!src.slice(src.indexOf('export async function changeRoutePointOrder('),
    src.indexOf('export async function duplicateRouteAsTemplate(')).includes('UPDATE route_run_items'));
  assert.ok(src.includes('COPY')===false);
});
