import test from 'node:test';
import assert from 'node:assert/strict';
import {duplicateOrderDraft, needsPriorityAttention} from '../src/operatorActions.ts';

const os = {
  id: 'os-101', title: 'Lubrificar mancais', description: 'Graxa HD2T',
  category: 'Lubrificação', priority: 'Alta', asset_id: 'asset-7', sector:'Sala de Cortes',
  recurrence_days: 30, due_date: '2026-10-01', status: 'pending',
  archived_at: null, archive_reason: '', block_reason: 'Falta peça',
  blocked_at: '2026-10-20T12:00:00Z', partial_reason: 'Parte não executada',
  partial_at: '2026-10-20T12:00:00Z', created_at: '2026-01-01T12:00:00Z',
  updated_at: '2026-10-20T12:00:00Z', asset_name: 'Transportadora',
  asset_code: 'TR-01', asset_area: 'Produção'
};

test('duplicar OS preenche apenas dados do novo planejamento e atualiza a data', () => {
  const original = structuredClone(os);
  assert.deepEqual(duplicateOrderDraft(os, '2026-10-21'), {
    title: 'Lubrificar mancais', description: 'Graxa HD2T',
    category: 'Lubrificação', priority: 'Alta', asset_id: 'asset-7', sector:'Sala de Cortes', sector:'Sala de Cortes',
    recurrence_days: 30, due_date: '2026-10-21',
  });
  assert.deepEqual(os, original, 'não alterar a OS de origem');
});

test('duplicar não herda impedimento, execução parcial ou identificadores', () => {
  const copy=duplicateOrderDraft(os,'2026-10-22');
  for(const key of ['id','status','block_reason','blocked_at','partial_reason','partial_at','archived_at','created_at','updated_at']){
    assert.equal(Object.hasOwn(copy,key),false,key);
  }
});
test('OS arquivada e data inválida não podem ser duplicadas', () => {
  assert.throws(()=>duplicateOrderDraft({...os,archived_at:'2026-10-20T12:00:00Z'},'2026-10-21'),/Reative/);
  assert.throws(()=>duplicateOrderDraft(os,'2026-02-30'),/inválida/);
});
test('filtro prioridade mostra pendentes de Alta, incluindo bloqueios', () => {
  assert.equal(needsPriorityAttention(os),true);
  assert.equal(needsPriorityAttention({...os,block_reason:'',priority:'Média'}),false);
  assert.equal(needsPriorityAttention({...os,status:'completed'}),false);
  assert.equal(needsPriorityAttention({...os,archived_at:'2026-10-21T10:00:00Z'}),false);
});
