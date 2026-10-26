import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDailyDigest,planDailyAndPriority,DIGEST_DAYS,MAX_LOCAL_NOTICES} from '../src/dailyNoticePlan.ts';

const at=(y,m,d,h,minute=0)=>new Date(y,m-1,d,h,minute,0,0);
const entries=[
  {id:'o1',type:'order',title:'Motor 101',dueDate:'2026-10-22',category:'Lubrificação',priority:'Média'},
  {id:'o2',type:'order',title:'Bomba 102',dueDate:'2026-10-22',category:'Lubrificação',priority:'Baixa'},
  {id:'o3',type:'order',title:'Redutor',dueDate:'2026-10-22',category:'Mecânica',priority:'Média'},
  {id:'o4',type:'order',title:'Quadro',dueDate:'2026-10-22',category:'Elétrica',priority:'Baixa'},
  {id:'r1',type:'route',title:'Paletização',dueDate:'2026-10-22',attentionCount:0},
];

test('um resumo consolidado para quatro OS e uma rota, com categorias',()=>{
  const d=buildDailyDigest(entries,'2026-10-22');
  assert.equal(d.orders,4);
  assert.equal(d.routes,1);
  assert.match(d.body,/4 OS e 1 rota programadas para hoje/);
  assert.match(d.body,/Lubrificação: 2/);
  assert.match(d.body,/Mecânica: 1/);
  assert.match(d.body,/Elétrica: 1/);
});
test('às 05h30 amanhã haverá apenas um resumo, não cinco avisos por tarefas normais',()=>{
  const list=planDailyAndPriority(entries,at(2026,10,21,9,0),5,30);
  assert.equal(list.filter(x=>x.kind==='daily').length,DIGEST_DAYS);
  assert.equal(list.filter(x=>x.kind!=='daily').length,0);
  const tomorrow=list.find(x=>x.key==='daily:2026-10-22');
  assert.ok(tomorrow);
  assert.equal(tomorrow.date.getHours(),5);
  assert.equal(tomorrow.date.getMinutes(),30);
  assert.match(tomorrow.body,/4 OS e 1 rota/);
});
test('OS concluída não entra no resumo e rota avulsa sem vencimento não entra no resumo',()=>{
  const d=buildDailyDigest([...entries,{id:'c',type:'order',title:'Feita',dueDate:'2026-10-22',completed:true},
    {id:'r2',type:'route',title:'Avulsa',dueDate:null}],'2026-10-22');
  assert.equal(d.orders,4);assert.equal(d.routes,1);
});
test('pendências vencidas, OS impedida e rota com anomalia geram alertas individuais',()=>{
  const items=[
    {id:'ro',type:'route',title:'Rota afetada',dueDate:'2026-10-30',attentionCount:2},
    {id:'os',type:'order',title:'OS travada',dueDate:'2026-10-25',blocked:true,priority:'Média',assetCode:'EQ-123'},
    {id:'late',type:'order',title:'Atrasada',dueDate:'2026-10-20',priority:'Média'},
    {id:'regular',type:'order',title:'Normal',dueDate:'2026-10-22',priority:'Baixa'},
  ];
  const result=planDailyAndPriority(items,at(2026,10,21,4),5,30);
  assert.deepEqual(result.filter(x=>x.kind!=='daily').map(x=>x.kind),
    ['attention','blocked','overdue']);
  assert.match(result.find(x=>x.kind==='blocked').body,/TAG EQ-123/);
  assert.ok(result.every(x=>x.date.getTime()>at(2026,10,21,4).getTime()));
  const preview=buildDailyDigest(items,'2026-10-21');
  assert.equal(preview.blocked,1);assert.equal(preview.anomalies,1);
});
test('OS Alta recebe aviso no dia do vencimento, não antes',()=>{
  const notices=planDailyAndPriority([
    {id:'urgent',type:'order',title:'Parada programada',dueDate:'2026-10-23',priority:'Alta'},
  ],at(2026,10,21,16),5,30);
  const critical=notices.find(x=>x.kind==='high');
  assert.ok(critical);
  assert.equal(critical.date.getDate(),23);
  assert.equal(critical.date.getHours(),5);
  assert.equal(critical.date.getMinutes(),30);
});
test('caso hora escolhida 05h30 já passou: próximo resumo somente amanhã',()=>{
  const plan=planDailyAndPriority(entries,at(2026,10,21,5,31),5,30);
  const first=plan.find(x=>x.kind==='daily');
  assert.equal(first.key,'daily:2026-10-22');
  assert.equal(first.date.getDate(),22);
});
test('horário é livre incluindo 05h37, sem misturar notificações individuais',()=>{
  const plan=planDailyAndPriority(entries,at(2026,10,21,20),5,37);
  assert.equal(plan[0].date.getMinutes(),37);
});
test('sete resumos garantidos e prioritárias limitadas ao teto global',()=>{
  const many=Array.from({length:100},(_,i)=>({
    id:'x'+i,type:'order',title:'OS '+i,dueDate:'2026-10-21',blocked:true,priority:'Alta'
  }));
  const plan=planDailyAndPriority(many,at(2026,10,21,4),5,30);
  assert.equal(plan.length,MAX_LOCAL_NOTICES);
  assert.equal(plan.filter(x=>x.kind==='daily').length,DIGEST_DAYS);
  assert.equal(plan.filter(x=>x.kind!=='daily').length,MAX_LOCAL_NOTICES-DIGEST_DAYS);
});
test('resumo sem tarefas informa dia livre; sem notificação individual',()=>{
  const plan=planDailyAndPriority([],at(2026,10,21,4),5,30);
  assert.equal(plan.length,DIGEST_DAYS);
  assert.match(plan[0].body,/Nenhuma OS ou rota programada/);
});
test('plano recusará horário inválido e não cria notificações em hora passada',()=>{
  assert.throws(()=>planDailyAndPriority([],at(2026,10,21,4),24,0),/Horário/);
  const now=at(2026,10,21,5,34);
  const p=planDailyAndPriority([{id:'r',type:'route',title:'Anomalia',dueDate:null,attentionCount:1}],now,5,30);
  assert.ok(p.every(x=>x.date.getTime()>now.getTime()));
});
