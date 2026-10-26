import test from 'node:test';
import assert from 'node:assert/strict';
import {completionPlan, executionDecision} from '../src/operations.ts';

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

test('registro parcial mantém OS aberta e não reagenda prazo', () => {
  const plan = completionPlan(initial, {...initial}, '2026-10-20');
  assert.deepEqual(executionDecision('partial', 'Mancal B ainda depende de parada.', plan.nextDue), {
    orderStatus:'pending', nextDue:null, partialReason:'Mancal B ainda depende de parada.',
    notes:'Mancal B ainda depende de parada.'
  });
});
test('registro concluído segue encerramento de avulsa ou renovação de recorrente', () => {
  assert.equal(executionDecision('completed', 'Executado', null).orderStatus, 'completed');
  assert.equal(executionDecision('completed', 'Executado', '2026-11-19').nextDue, '2026-11-19');
  assert.equal(executionDecision('completed', 'Executado', '2026-11-19').partialReason, '');
});
test('registro parcial exige descrição suficiente sem texto excessivo', () => {
  assert.throws(() => executionDecision('partial', 'faltou', '2026-11-19'), /10 a 1000/);
  assert.throws(() => executionDecision('partial', 'a'.repeat(1001), null), /10 a 1000/);
  assert.throws(() => executionDecision('unknown', 'Descrição suficiente', null), /inválido/);
});
