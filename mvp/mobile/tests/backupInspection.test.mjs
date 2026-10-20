import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectBackup} from '../src/backupInspection.ts';

const data = () => ({
  format: 'rotamanutencao-offline', version: 3, exported_at: '2026-10-20T13:30:00.000Z',
  assets: [{id: 'asset-1', name: 'Bomba', code: 'BM-101', area: 'Produção', created_at: '2026-10-20T13:30:00.000Z'}],
  work_orders: [{id: 'order-1',title:'Inspeção',description:'',category:'Mecânica',priority:'Alta',asset_id:'asset-1',recurrence_days:30,due_date:'2026-10-21',status:'pending',block_reason:'Aguardando parada',blocked_at:'2026-10-20T13:30:00.000Z',created_at:'2026-10-20T13:30:00.000Z',updated_at:'2026-10-20T13:30:00.000Z'}],
  executions: [], photos: [], order_events: [{id:'event-1',order_id:'order-1',event_type:'blocked',reason:'Aguardando parada',created_at:'2026-10-20T13:30:00.000Z'}]
});

test('inspecionar backup v3 retorna resumo sem modificar arquivo original', () => {
  const source = data();
  const before = JSON.stringify(source);
  const info = inspectBackup(source);
  assert.deepEqual(info, {version:3, exportedAt:'2026-10-20T13:30:00.000Z', assets:1,orders:1, executions:0,photos:0,events:1,impediments:1,partials:0});
  assert.equal(JSON.stringify(source), before);
});

test('inspeção rejeita periodicidade acima do limite da aplicação', () => {
  const source = data();
  source.work_orders[0].recurrence_days = 36501;
  assert.throws(() => inspectBackup(source), /Atividade com dados ou vínculos inválidos/);
});

test('inspeção rejeita arquivo inválido sem alterar os dados', () => {
  const source = data();
  delete source.order_events;
  assert.throws(() => inspectBackup(source), /Eventos do backup/);
});
