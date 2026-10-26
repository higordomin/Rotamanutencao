import test from 'node:test';
import assert from 'node:assert/strict';
import {planReminders,MAX_REMINDERS,validReminderTime,reminderTimeLabel} from '../src/reminderPlan.ts';

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
test('aceita qualquer hora e minuto no formato 24h, inclusive 08:07',()=>{
  assert.equal(reminderTimeLabel(8,7),'08:07');
  assert.equal(reminderTimeLabel(23,59),'23:59');
  assert.equal(validReminderTime(0,0),true);
  assert.equal(validReminderTime(24,0),false);
  assert.equal(validReminderTime(10,60),false);
  const r=planReminders([{id:'1',type:'order',title:'Teste',dueDate:'2026-10-21'}],at(2026,10,21,8),8,7);
  assert.equal(r[0].date.getHours(),8);
  assert.equal(r[0].date.getMinutes(),7);
});
test('horário passado não dispara imediatamente: seleciona amanhã no minuto escolhido',()=>{
  const now=new Date(2026,9,21,8,9);
  const r=planReminders([{id:'1',type:'route',title:'Rota',dueDate:'2026-10-21'}],now,8,0);
  assert.equal(r[0].date.getDate(),22);
  assert.equal(r[0].date.getHours(),8);
  assert.equal(r[0].date.getMinutes(),0);
});
test('horário inválido recusa minutos ou horas fracionários',()=>{
  for(const [h,m] of [[24,0],[-1,0],[8,60],[8,-1],[8,2.5]]){
    assert.throws(()=>planReminders([],at(2026,10,21,9),h,m),/Horário/);
  }
});
