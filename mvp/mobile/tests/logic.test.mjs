import assert from 'node:assert/strict';
import test from 'node:test';
import {validDate, addDays, taskState, taskSummary} from '../src/logic.ts';

test('data valida considera anos bissextos e não aceita normalização silenciosa', () => {
  assert.equal(validDate('2028-02-29'), true);
  for (const date of ['2027-02-29', '2026-13-01', '2026-02-30', '2026-2-3', '1899-01-01', '2101-01-01'])
    assert.equal(validDate(date), false, date);
});
test('recorrência é calculada sem drift na virada do mês e ano', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2028-02-29', 1), '2028-03-01');
  assert.throws(() => addDays('2026-02-30', 1));
  assert.throws(() => addDays('2026-01-01', -1));
});
test('impedimentos são separados dos atrasos, sem escondê-los do banco', () => {
  const tasks = [
    {status: 'pending', due_date: '2026-10-01', block_reason: 'Aguardando peças'},
    {status: 'pending', due_date: '2026-10-01', block_reason: ''},
    {status: 'pending', due_date: '2026-10-20', block_reason: ''},
    {status: 'pending', due_date: '2026-10-22', block_reason: ''},
    {status: 'completed', due_date: '2026-10-01', block_reason: ''},
  ];
  assert.equal(taskState(tasks[0], '2026-10-20'), 'blocked');
  assert.deepEqual(taskSummary(tasks, '2026-10-20'), {blocked: 1, completed: 1, overdue: 1, today: 1, upcoming: 1});
});
