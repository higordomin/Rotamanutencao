import test from 'node:test';
import assert from 'node:assert/strict';
import {mayQuickCompletePoint,needsReasonForPoint} from '../src/executionGuide.ts';
test('ponto pendente intacto permite execução rápida',()=>{
  assert.equal(mayQuickCompletePoint('pending',false,false),true);
});
test('nunca descarta edição, fotos ou execução fechada com toque direto',()=>{
  for(const status of ['done','anomaly','skipped'])
    assert.equal(mayQuickCompletePoint(status,false,false),false);
  assert.equal(mayQuickCompletePoint('pending',true,false),false);
  assert.equal(mayQuickCompletePoint('pending',false,true),false);
});
test('anomalia e não executado continuam exigindo justificativa',()=>{
  assert.equal(needsReasonForPoint('done'),false);
  assert.equal(needsReasonForPoint('anomaly'),true);
  assert.equal(needsReasonForPoint('skipped'),true);
});
