import test from 'node:test';
import assert from 'node:assert/strict';
import {brazilianDate, dateFromParts, monthGrid, pageFromDate, shiftMonth} from '../src/calendar.ts';

test('calendário mostra outubro/2026 a partir da data ISO', () => {
  const page = pageFromDate('2026-10-20');
  assert.deepEqual(page, {year: 2026, month: 10});
  const cells = monthGrid(page);
  assert.equal(cells.length % 7, 0);
  assert.equal(cells.filter(Boolean).length, 31);
  assert.equal(cells[3], '2026-10-01');
  assert.equal(cells.includes('2026-10-20'), true);
  assert.equal(brazilianDate('2026-10-20'), '20/10/2026');
});

test('fevereiro bissexto contém 29 dias sem saltos de fuso', () => {
  const feb = monthGrid({year: 2028, month: 2}).filter(Boolean);
  assert.equal(feb.length, 29);
  assert.equal(feb[0], '2028-02-01');
  assert.equal(feb.at(-1), '2028-02-29');
  assert.throws(() => dateFromParts(2027, 2, 29));
});

test('navegação entre dezembro e janeiro funciona', () => {
  assert.deepEqual(shiftMonth({year: 2026, month: 12}, 1), {year: 2027, month: 1});
  assert.deepEqual(shiftMonth({year: 2027, month: 1}, -1), {year: 2026, month: 12});
});

test('navegação respeita limites compatíveis com banco', () => {
  assert.equal(shiftMonth({year: 1900, month: 1}, -1), null);
  assert.equal(shiftMonth({year: 2100, month: 12}, 1), null);
  assert.throws(() => monthGrid({year: 1899, month: 12}));
  assert.throws(() => dateFromParts(2101, 1, 1));
});

test('formato brasileiro conserva ISO e rejeita datas inválidas', () => {
  assert.equal(brazilianDate('2026-13-01'), 'Selecionar data');
  assert.equal(dateFromParts(2026, 1, 3), '2026-01-03');
});
