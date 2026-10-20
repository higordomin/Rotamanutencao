import test from 'node:test';
import assert from 'node:assert/strict';
import {completionPlan} from '../src/operations.ts';

const initial = {id:'os-101',status:'pending',block_reason:'',due_date:'2026-10-20',updated_at:'2026-10-20T10:00:00Z',recurrence_days:30};
test('planejamento de execução recorrente na virada do mês', () => {
  assert.deepEqual(completionPlan(initial, {...initial}, '2026-10-31'), {nextDue:'2026-11-30'});
});
test('atividade avulsa não cria recorrência', () => {
  assert.deepEqual(completionPlan({...initial,recurrence_days:0},{...initial,recurrence_days:0},'2026-10-20'),{nextDue:null});
});
test('mudança de data ou revisão bloqueia gravação de OS desatualizada', () => {
  assert.throws(() => completionPlan(initial,{...initial,due_date:'2026-10-24'},'2026-10-20'),/mudou/);
  assert.throws(() => completionPlan(initial,{...initial,updated_at:'2026-10-20T10:00:01Z'},'2026-10-20'),/mudou/);
});
test('impedida, concluída ou excluída não permite execução', () => {
  assert.throws(() => completionPlan(initial,{...initial,block_reason:'Falta peça'},'2026-10-20'),/impedimento/);
  assert.throws(() => completionPlan(initial,{...initial,status:'completed'},'2026-10-20'),/concluída/);
  assert.throws(() => completionPlan(initial,null,'2026-10-20'),/não existe/);
});
