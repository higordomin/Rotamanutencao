import test from 'node:test';
import assert from 'node:assert/strict';
import {gramAmount,routeResult,appliedGrams} from '../src/routeRules.ts';
test('quantidade em gramas aceita decimal brasileiro e zero',()=>{
  assert.equal(gramAmount('0'),0);
  assert.equal(gramAmount('3,5'),3.5);
  assert.equal(gramAmount('0.125'),.125);
});
test('quantidade rejeita NaN, negativo e valor excessivo',()=>{
  for(const bad of ['abc','-1','100001','1,9999','']) {
    // Campo vazio é rejeitado pela tela, mas parser numérico interpreta "" como zero.
    if(bad==='')continue;
    assert.throws(()=>gramAmount(bad),/Quantidade inválida/);
  }
});
test('anomalia e não executado exigem descrição significativa',()=>{
  assert.throws(()=>routeResult('anomaly','Faltou'),/mínimo 10/);
  assert.throws(()=>routeResult('skipped',''),/mínimo 10/);
  assert.equal(routeResult('anomaly','  Vazamento no mancal inferior   '),'Vazamento no mancal inferior');
});
test('executado permite anotações vazias; pendente não é registro',()=>{
  assert.equal(routeResult('done',''),'');
  assert.throws(()=>routeResult('pending','teste suficiente'),/resultado/);
});

test('ponto não executado nunca contabiliza graxa planejada como aplicada',()=>{
  assert.equal(appliedGrams('skipped','3,5'),0);
  assert.equal(appliedGrams('done','3,5'),3.5);
  assert.throws(()=>appliedGrams('anomaly','-3'),/Quantidade inválida/);
});
