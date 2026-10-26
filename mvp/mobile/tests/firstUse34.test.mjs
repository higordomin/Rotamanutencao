import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldShowFirstUseGuide,FIRST_USE_STEPS} from '../src/firstUse34.ts';
const empty={assets:0,orders:0,routes:0,executions:0,archived:0};
test('mostra guia apenas sem registros locais',()=>{
 assert.equal(shouldShowFirstUseGuide(empty),true);
 for(const name of Object.keys(empty))
   assert.equal(shouldShowFirstUseGuide({...empty,[name]:1}),false);
});
test('não considera contagens inválidas como instalação nova',()=>{
 for(const count of [-1,NaN,1.5,Infinity])
   assert.equal(shouldShowFirstUseGuide({...empty,orders:count}),false);
});
test('ensina o fluxo sem criar dados ou prometer login',()=>{
 assert.equal(FIRST_USE_STEPS.length,4);
 assert.deepEqual(FIRST_USE_STEPS.map(s=>s.number),[1,2,3,4]);
 assert.match(FIRST_USE_STEPS[0].description,/opcional/);
 assert.match(FIRST_USE_STEPS.at(-1).description,/aparelho/);
});
