import test from 'node:test';
import assert from 'node:assert/strict';
import {
 noticeFingerprint,sameNoticePlan,replaceScheduledNoticesSafely,
} from '../src/reminderReconcile.ts';

const at=new Date('2026-10-27T11:00:00.000Z');
const sample=(key,title,when=at)=>({key,kind:'daily',title,body:'Rotas e OS',date:when});
const p=[sample('daily:2026-10-27','Resumo do dia'),
 sample('attention:route:2','Anomalia da linha',new Date('2026-10-27T11:02:00Z'))];

test('mesmo plano não é recriado, independentemente da ordem de avisos Android',()=>{
 const f=p.map(noticeFingerprint);
 assert.equal(sameNoticePlan(f,p),true);
 assert.equal(sameNoticePlan([...f].reverse(),p),true);
 assert.equal(sameNoticePlan([f[0]],p),false);
 assert.equal(sameNoticePlan([null,f[1]],p),false);
 assert.equal(sameNoticePlan([f[0],f[0]],p),false);
});
test('mudar data, título ou corpo exige reprogramação',()=>{
 const sig=noticeFingerprint(p[0]);
 assert.notEqual(sig,noticeFingerprint({...p[0],date:new Date(at.getTime()+60000)}));
 assert.notEqual(sig,noticeFingerprint({...p[0],title:'Outro'}));
 assert.notEqual(sig,noticeFingerprint({...p[0],body:'Outro'}));
 assert.throws(()=>noticeFingerprint({...p[0],date:new Date('invalid')}),/inválida/);
});
test('todos os avisos são agendados antes de cancelar antigos',async()=>{
 const log=[];
 const n=await replaceScheduledNoticesSafely(['old-1','old-2'],p,
  async x=>{log.push('schedule:'+x.key);return 'new:'+x.key;},
  async id=>{log.push('cancel:'+id);});
 assert.equal(n,2);
 assert.deepEqual(log.slice(0,2),['schedule:daily:2026-10-27','schedule:attention:route:2']);
 assert.ok(log.slice(2).every(x=>x.startsWith('cancel:old')));
});
test('falha parcial de agendamento preserva antigos e limpa só novos',async()=>{
 const log=[];
 await assert.rejects(()=>replaceScheduledNoticesSafely(['old-1'],p,
  async x=>{if(x===p[1])throw Error('sem permissão temporária');
    log.push('schedule:new-1');return 'new-1';},
  async id=>{log.push('cancel:'+id);}),/sem permissão/);
 assert.deepEqual(log,['schedule:new-1','cancel:new-1']);
});
test('falha ao cancelar antigo mantém novos, e comunica duplicação',async()=>{
 const log=[];
 await assert.rejects(()=>replaceScheduledNoticesSafely(['old-1'],p,
  async x=>{log.push('schedule:'+x.key);return 'new:'+x.key;},
  async id=>{log.push('cancel:'+id);throw Error('old locked');}),/duplicações/);
 assert.ok(log.filter(x=>x.startsWith('schedule')).length===2);
 assert.deepEqual(log.at(-1),'cancel:old-1');
});
test('lista vazia não apaga alertas de outro módulo, somente IDs recebidos',async()=>{
 const canceled=[];
 assert.equal(await replaceScheduledNoticesSafely(['ours'],[],
  async()=>{throw Error('não esperado');},async id=>{canceled.push(id);}),0);
 assert.deepEqual(canceled,['ours']);
});
