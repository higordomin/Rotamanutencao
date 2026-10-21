import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRecurrence,routePlanInput,routePlanningState,planAfterRouteRun} from '../src/routeSchedule.ts';

test('períodos permitem 0 (avulsa), 7, 30, 180 e 365 dias',()=>{
  for (const day of [0,7,30,180,365]) assert.equal(parseRecurrence(String(day)),day);
  assert.deepEqual(routePlanInput('30','2026-10-21'),
    {recurrence_days:30,next_due_date:'2026-10-21'});
  assert.deepEqual(routePlanInput('0','2026-10-21'),
    {recurrence_days:0,next_due_date:null});
});

test('períodos inválidos nunca entram no SQLite',()=>{
  for (const val of ['','-1','3.5','30 dias','abc','36501'])assert.throws(()=>parseRecurrence(val));
  assert.throws(()=>routePlanInput('30',null),/data válida/);
  assert.throws(()=>routePlanInput('30','2026-02-31'),/data válida/);
});

test('rotas classificam vencido, hoje, futuro, pendente e avulso',()=>{
  const r={recurrence_days:30,next_due_date:'2026-10-20',attention_count:0};
  assert.equal(routePlanningState(r,'2026-10-21'),'overdue');
  assert.equal(routePlanningState({...r,next_due_date:'2026-10-21'},'2026-10-21'),'today');
  assert.equal(routePlanningState({...r,next_due_date:'2026-10-22'},'2026-10-21'),'upcoming');
  assert.equal(routePlanningState({...r,attention_count:1,next_due_date:'2026-11-10'},'2026-10-21'),'attention');
  assert.equal(routePlanningState({...r,recurrence_days:0,next_due_date:null},'2026-10-21'),'unscheduled');
});

test('finalização completa reagenda usando data local de finalização',()=>{
  const r={recurrence_days:30,next_due_date:'2026-10-15'};
  assert.deepEqual(planAfterRouteRun(r,0,0,'2026-10-21'),
    {next_due_date:'2026-11-20',attention_count:0});
});

test('anomalia e ponto não executado não alteram prazo e exigem retorno',()=>{
  const r={recurrence_days:7,next_due_date:'2026-10-19'};
  assert.deepEqual(planAfterRouteRun(r,1,2,'2026-10-21'),
    {next_due_date:'2026-10-19',attention_count:3});
  assert.deepEqual(planAfterRouteRun({...r,recurrence_days:0,next_due_date:null},0,1,'2026-10-21'),
    {next_due_date:null,attention_count:1});
});

test('rota avulsa permanece avulsa após execução sem pendências',()=>{
  assert.deepEqual(planAfterRouteRun({recurrence_days:0,next_due_date:null},0,0,'2026-10-21'),
    {next_due_date:null,attention_count:0});
  assert.throws(()=>planAfterRouteRun({recurrence_days:7,next_due_date:'2026-10-21'},-1,0,'2026-10-21'));
});
