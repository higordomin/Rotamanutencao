import test from 'node:test';
import assert from 'node:assert/strict';
import {planReminders,MAX_REMINDERS,REMINDER_HOURS} from '../src/reminderPlan.ts';

const at=(y,m,d,h)=>new Date(y,m-1,d,h,0,0,0);
test('agenda vencimento de OS no horário selecionado',()=>{
  const reminders=planReminders([{id:'1',type:'order',title:'Lubrificação',dueDate:'2026-10-22'}],at(2026,10,21,6),14);
  assert.equal(reminders.length,1);
  assert.equal(reminders[0].kind,'soon');
  assert.equal(reminders[0].date.getHours(),14);
  assert.equal(reminders[0].date.getDate(),22);
});
test('dia atual já passado agenda amanhã sem disparo imediato',()=>{
  const reminders=planReminders([{id:'1',type:'route',title:'Rota',dueDate:'2026-10-21'}],at(2026,10,21,21),8);
  assert.equal(reminders[0].kind,'overdue');
  assert.equal(reminders[0].date.getDate(),22);
});
test('anomalia sem data futura tem aviso pontual no próximo horário',()=>{
  const r=planReminders([{id:'x',type:'route',title:'Anomalia',dueDate:null,attentionCount:2}],at(2026,10,21,18),19);
  assert.equal(r[0].kind,'attention');
  assert.equal(r[0].date.getHours(),19);
});
test('não notifica OS concluída, rota avulsa regular ou data muito distante',()=>{
  const list=[
    {id:'1',type:'order',title:'Feita',dueDate:'2026-10-21',completed:true},
    {id:'2',type:'route',title:'Avulsa',dueDate:null},
    {id:'3',type:'route',title:'Longínqua',dueDate:'2027-01-01'}
  ];
  assert.deepEqual(planReminders(list,at(2026,10,21,9),8),[]);
});
test('alertas críticos têm precedência e limite de quarenta notificações',()=>{
  const a=Array.from({length:60},(_,i)=>({id:String(i),type:'order',title:'OS '+i,dueDate:'2026-10-21'}));
  a.push({id:'critical',type:'route',title:'Pendência',dueDate:null,attentionCount:1});
  const r=planReminders(a,at(2026,10,20,9),19);
  assert.equal(r.length,MAX_REMINDERS);
  assert.equal(r[0].key,'route:critical');
});
test('horário de lembrete precisa ser uma opção válida',()=>{
  assert.deepEqual([...REMINDER_HOURS],[8,14,19]);
  assert.throws(()=>planReminders([],at(2026,10,21,9),28),/Horário/);
});
