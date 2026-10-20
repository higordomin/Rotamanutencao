import assert from 'node:assert/strict';
import test from 'node:test';
import {validateBackup} from '../src/backupValidation.ts';
const stamp = '2026-10-20T12:00:00Z';
const order = {id: 'ord1', title: 'Lubrificar motor', description: '', category: 'Lubrificação',
  priority: 'Alta', asset_id: 'a1', recurrence_days: 30, due_date: '2026-10-20',
  status: 'pending', created_at: stamp, updated_at: stamp,
  block_reason: 'Aguardando peças', blocked_at: stamp};
function fixture() {
  return {format: 'rotamanutencao-offline', version: 3, exported_at: stamp,
    assets: [{id: 'a1', code: 'MC-01', name: 'Motor', area: 'Utilidades', created_at: stamp}],
    work_orders: [structuredClone(order)], executions: [], photos: [], order_events: [
      {id: 'e1', order_id: 'ord1', event_type: 'blocked', reason: 'Aguardando peças', created_at: stamp}
    ]};
}
const check = d => assert.doesNotThrow(() => validateBackup(d));
const rejects = (d, msg) => assert.throws(() => validateBackup(d), msg);

test('backup v3 com impedimento e auditoria válido', () => check(fixture()));
test('importação de backup legado v2 sem bloqueio e eventos', () => {
  const data = fixture(); data.version = 2;
  delete data.order_events;
  delete data.work_orders[0].block_reason;
  delete data.work_orders[0].blocked_at;
  check(data);
});
test('backup v3 sem eventos é rejeitado', () => {
  const data = fixture(); delete data.order_events; rejects(data, /Eventos/);
});
test('ordem com equipamento inexistente é rejeitada', () => {
  const data = fixture(); data.work_orders[0].asset_id = 'naoexiste'; rejects(data, /Atividade/);
});
test('impedimento malformado é rejeitado', () => {
  const data = fixture(); data.work_orders[0].block_reason = 100; rejects(data, /Atividade/);
});
test('referência de auditoria órfã é rejeitada', () => {
  const data = fixture(); data.order_events[0].order_id = 'inexistente'; rejects(data, /Evento/);
});
test('não permite identificadores duplicados', () => {
  const data = fixture(); data.assets.push(structuredClone(data.assets[0])); rejects(data, /repetido/);
});
test('impedimento não pode superar 500 caracteres', () => {
  const data = fixture(); data.order_events[0].reason = 'x'.repeat(501); rejects(data, /Evento/);
});

test('backup v3 rejeita motivo sem data de impedimento', () => {
  const data = fixture(); data.work_orders[0].blocked_at = null; rejects(data, /Atividade/);
});
test('backup v3 rejeita OS concluída com impedimento', () => {
  const data = fixture(); data.work_orders[0].status = 'completed'; rejects(data, /Atividade/);
});
test('backup v3 rejeita evento de bloqueio sem motivo', () => {
  const data = fixture(); data.order_events[0].reason = ''; rejects(data, /Evento/);
});

test('backup v4 com execução parcial e pendência aberta é válido', () => {
  const data = fixture();
  data.version = 4;
  data.work_orders[0].partial_reason = 'Aguardando motor de reposição';
  data.work_orders[0].partial_at = stamp;
  data.executions = [{
    id:'x-partial',order_id:'ord1',order_title:'Lubrificar motor',
    notes:'Aguardando motor de reposição',executed_at:stamp,
    previous_due_date:'2026-10-20',next_due_date:null,
    asset_label:'MC-01',category:'Lubrificação',result:'partial'
  }];
  check(data);
  data.executions[0].next_due_date = '2026-11-19';
  rejects(data, /Execução/);
  data.executions[0].next_due_date = null;
  data.work_orders[0].status='completed';
  rejects(data, /Atividade/);
});
test('backup v4 exige campo de resultado e dados da pendência', () => {
  const data = fixture(); data.version = 4;
  data.work_orders[0].partial_reason = '';
  data.work_orders[0].partial_at = null;
  check(data);
  delete data.work_orders[0].partial_reason;
  rejects(data, /Atividade/);
  data.work_orders[0].partial_reason='';
  data.executions.push({id:'exec',order_id:'ord1',order_title:'Lubrificar motor',
    notes:'Registro completo',executed_at:stamp,previous_due_date:'2026-10-20',
    next_due_date:null,asset_label:'MC-01',category:'Lubrificação'});
  rejects(data, /Execução/);
});
