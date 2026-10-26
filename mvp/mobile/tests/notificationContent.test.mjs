import test from 'node:test';
import assert from 'node:assert/strict';
import {formatDailyNotification,formatPriorityNotification,validNoticeAppearance,
 DEFAULT_NOTICE_APPEARANCE,MAX_NOTICE_BODY,MAX_NOTICE_TITLE} from '../src/notificationContent.ts';
import {planDailyAndPriority} from '../src/dailyNoticePlan.ts';

const order={id:'test',type:'order',title:'Inspecionar redutor',
 dueDate:'2026-10-26',assetCode:'RD-101',category:'Mecânica',priority:'Alta'};
test('dois formatos e TAG exibem diferenças reais',()=>{
 const concise=formatPriorityNotification(order,'high',{style:'objetivo',showTag:true});
 const detailed=formatPriorityNotification(order,'high',{style:'detalhado',showTag:true});
 assert.match(concise.title,/OS.*Prioridade alta.*Inspecionar redutor/);
 assert.match(concise.body,/TAG RD-101/);
 assert.doesNotMatch(concise.body,/Mecânica|Prazo/);
 assert.match(detailed.body,/Mecânica/);
 assert.match(detailed.body,/Prazo 26\/10\/2026/);
 assert.doesNotMatch(formatPriorityNotification(order,'high',{style:'detalhado',showTag:false}).body,/TAG/);
});
test('rota com ocorrência não recebe TAG inventada nem especialidade',()=>{
 const r={id:'r',type:'route',title:'Rota da paletização',dueDate:null,attentionCount:2};
 const note=formatPriorityNotification(r,'attention',{style:'detalhado',showTag:true});
 assert.match(note.title,/Rota.*Ocorrência/);
 assert.match(note.body,/2 ponto/);
 assert.doesNotMatch(note.body,/TAG|Mecânica|Prazo/);
});
test('corpo e título não ficam extensos e texto é higienizado',()=>{
 const large={...order,title:'Inspeção '+(' A\n'.repeat(400)),assetCode:'X'.repeat(500)};
 const n=formatPriorityNotification(large,'blocked',{style:'detalhado',showTag:true});
 assert.ok(n.title.length<=MAX_NOTICE_TITLE);
 assert.ok(n.body.length<=MAX_NOTICE_BODY);
 assert.doesNotMatch(n.title,/\n/);
});
test('resumo objetivo vs detalhado e dia sem atividade',()=>{
 const counts={orders:3,routes:1,overdue:2,blocked:1,anomalies:1,categories:['Mecânica: 2']};
 const concise=formatDailyNotification(counts,{style:'objetivo',showTag:true});
 const detailed=formatDailyNotification(counts,{style:'detalhado',showTag:false});
 assert.match(concise.body,/3 OS e 1 rota/);
 assert.match(concise.body,/2 atrasada/);
 assert.doesNotMatch(concise.body,/Mecânica/);
 assert.match(detailed.body,/Mecânica/);
 assert.match(formatDailyNotification({...counts,orders:0,routes:0,overdue:0,blocked:0,anomalies:0},DEFAULT_NOTICE_APPEARANCE).body,/Nenhuma OS/);
});
test('configuração válida e inválida',()=>{
 assert.equal(validNoticeAppearance(DEFAULT_NOTICE_APPEARANCE),true);
 for(const x of [null,{}, {style:'livre',showTag:true},{style:'objetivo',showTag:'sim'}]){
  assert.equal(validNoticeAppearance(x),false);
 }
 assert.throws(()=>formatPriorityNotification(order,'high',{style:'livre',showTag:true}),/inválidas/);
});
test('prioridade alta dispara no minuto escolhido, sem antecipar ou somar 2 minutos',()=>{
 const now=new Date(2026,9,26,6,0);
 const planned=planDailyAndPriority([order],now,7,37,{style:'objetivo',showTag:false});
 const high=planned.find(x=>x.kind==='high');
 assert.ok(high);
 assert.equal(high.date.getHours(),7);
 assert.equal(high.date.getMinutes(),37);
 assert.equal(high.date.getSeconds(),0);
 assert.doesNotMatch(high.body,/TAG/);
});
test('não repete aviso em horário passado e não modifica as OS originais',()=>{
 const items=[{...order,priority:'Alta'}],before=JSON.stringify(items);
 const now=new Date(2026,9,26,7,38);
 const planned=planDailyAndPriority(items,now,7,37);
 assert.ok(planned.every(x=>x.date>now));
 assert.equal(JSON.stringify(items),before);
});
