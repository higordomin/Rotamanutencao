import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROUTE_INTERVALS,previewRouteDates,scheduleNeedsConfirmation,routePlanningLabel,
} from '../src/routeProgramming.ts';
import {routePlanInput,routePlanningState} from '../src/routeSchedule.ts';

test('opções de intervalo incluem avulsa e periodicidades em dias fixos',()=>{
  assert.deepEqual(ROUTE_INTERVALS.map(x=>x.days),[0,7,15,30,60,90,180,365]);
  assert.ok(ROUTE_INTERVALS.every(x=>x.days>=0&&x.label.length));
});
test('programação avulsa não projeta datas e aceita qualquer data descartada',()=>{
  assert.deepEqual(previewRouteDates('0',null),[]);
  assert.deepEqual(previewRouteDates('0','2026-10-22'),[]);
});
test('prévia quinzenal usa dias reais e atravessa virada de ano',()=>{
  assert.deepEqual(previewRouteDates('15','2026-12-22'),[
    '2026-12-22','2027-01-06','2027-01-21',
  ]);
});
test('prévia semanal atravessa fevereiro bissexto e não confunde mês com 30 dias',()=>{
  assert.deepEqual(previewRouteDates(7,'2024-02-22'),[
    '2024-02-22','2024-02-29','2024-03-07',
  ]);
  assert.deepEqual(previewRouteDates(30,'2024-01-31'),[
    '2024-01-31','2024-03-01','2024-03-31',
  ]);
});
test('intervalos personalizados inteiros são aceitos, nunca gerados na Agenda automaticamente',()=>{
  assert.deepEqual(previewRouteDates('45','2026-01-05',2),['2026-01-05','2026-02-19']);
  assert.equal(routePlanInput('45','2026-01-05').recurrence_days,45);
});
test('datas e intervalos inválidos são rejeitados antes de qualquer gravação',()=>{
  for(const [days,date] of [['abc','2026-10-22'],['-1','2026-10-22'],
    ['30','2026-02-30'],['36501','2026-10-22'],['7',null]]){
    assert.throws(()=>previewRouteDates(days,date),/data válida|Periodicidade|periodicidade/);
  }
  for(const limit of [0,-1,7,1.5])assert.throws(()=>previewRouteDates('7','2026-10-22',limit),/prévia/);
});
test('reagendamento de rota atrasada precisa de confirmação para postergação',()=>{
  const old={recurrence_days:30,next_due_date:'2026-10-10',attention_count:0};
  const decision=scheduleNeedsConfirmation(old,{recurrence_days:30,next_due_date:'2026-11-01'},'2026-10-22');
  assert.deepEqual(decision,{needed:true,reason:'overdue'});
  assert.deepEqual(scheduleNeedsConfirmation(old,{recurrence_days:0,next_due_date:null},'2026-10-22'),
    {needed:true,reason:'overdue'});
  assert.deepEqual(scheduleNeedsConfirmation(old,{recurrence_days:30,next_due_date:'2026-10-10'},'2026-10-22'),
    {needed:false,reason:null});
  assert.deepEqual(scheduleNeedsConfirmation(old,{recurrence_days:30,next_due_date:'2026-10-05'},'2026-10-22'),
    {needed:false,reason:null});
});
test('reprogramação com anomalias exige confirmação e mantém alerta de atenção',()=>{
  const before={recurrence_days:7,next_due_date:'2026-10-15',attention_count:2};
  const next={recurrence_days:15,next_due_date:'2026-11-01'};
  assert.deepEqual(scheduleNeedsConfirmation(before,next,'2026-10-22'),
    {needed:true,reason:'attention'});
  assert.equal(routePlanningState({...before,...next},'2026-10-22'),'attention');
  assert.deepEqual(scheduleNeedsConfirmation(before,before,'2026-10-22'),
    {needed:false,reason:null});
});
test('planejamento futuro não precisa confirmação sem alerta anterior',()=>{
  const before={recurrence_days:30,next_due_date:'2026-11-01',attention_count:0};
  assert.deepEqual(scheduleNeedsConfirmation(before,{recurrence_days:60,next_due_date:'2026-11-10'},'2026-10-22'),
    {needed:false,reason:null});
});
test('rótulos compactos distinguem atrasos, pendências e avulsas',()=>{
  assert.deepEqual(['attention','overdue','today','upcoming','unscheduled'].map(routePlanningLabel),
    ['Com pendência','Atrasada','Para hoje','Programada','Avulsa']);
});
