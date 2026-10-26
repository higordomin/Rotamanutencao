import test from 'node:test';
import assert from 'node:assert/strict';
import {createActionGuard} from '../src/actionGuard.ts';

test('dois toques antes do re-render fazem apenas uma execução',async()=>{
 const guard=createActionGuard();
 let release;
 const calls=[];
 const first=guard.run(async()=>{
   calls.push('begin');
   await new Promise(resolve=>{release=resolve;});
   calls.push('end');
 });
 assert.equal(guard.busy,true);
 assert.equal(await guard.run(async()=>{calls.push('duplicated');}),false);
 release();
 assert.equal(await first,true);
 assert.deepEqual(calls,['begin','end']);
 assert.equal(guard.busy,false);
});
test('falha libera a trava para nova tentativa sem perder os erros',async()=>{
 const g=createActionGuard();
 await assert.rejects(()=>g.run(async()=>{throw Error('falhou');}),/falhou/);
 assert.equal(g.busy,false);
 assert.equal(await g.run(async()=>{}),true);
});
test('instâncias independentes não bloqueiam outras telas',async()=>{
 const a=createActionGuard(),b=createActionGuard();
 let done;
 const one=a.run(()=>new Promise(resolve=>{done=resolve;}));
 assert.equal(a.busy,true);
 assert.equal(await b.run(async()=>{}),true);
 done();
 await one;
});
