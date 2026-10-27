import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {orderDeletionBlockReason} from '../src/orderDeletion36.ts';

const blank={
  status:'pending',block_reason:'',blocked_at:null,partial_reason:'',partial_at:null,
  executions:0,events:0,corrective_links:0,
};
test('OS recém-criada pode ser excluída e OS arquivada sem histórico também',()=>{
  assert.equal(orderDeletionBlockReason(blank),null);
});
test('histórico de execução bloqueia exclusão, mesmo em OS recorrente pendente',()=>{
  assert.match(orderDeletionBlockReason({...blank,executions:1}),/execuções/);
});
test('vínculo corretivo com anomalia de rota impede perda de rastreabilidade',()=>{
  assert.match(orderDeletionBlockReason({...blank,corrective_links:1}),/anomalia/);
});
test('histórico de bloqueio, liberação e execução parcial impede apagar OS',()=>{
  assert.match(orderDeletionBlockReason({...blank,events:1}),/registros/);
  assert.match(orderDeletionBlockReason({...blank,block_reason:'Peças'}),/registros/);
  assert.match(orderDeletionBlockReason({...blank,blocked_at:'2026-10-20'}),/registros/);
  assert.match(orderDeletionBlockReason({...blank,partial_reason:'Falta peça'}),/registros/);
  assert.match(orderDeletionBlockReason({...blank,partial_at:'2026-10-20'}),/registros/);
});
test('OS concluída e ainda sem histórico acessível não é apagada por engano',()=>{
  assert.match(orderDeletionBlockReason({...blank,status:'completed'}),/concluída/);
});
test('UI oferece ação em OS ativas e arquivadas e exige confirmação destrutiva',()=>{
  const screen=fs.readFileSync(new URL('../App.tsx',import.meta.url),'utf8');
  assert.equal((screen.match(/label="Excluir OS"/g)||[]).length,2);
  assert.match(screen,/style:'destructive'[\s\S]*?deleteUnstartedOrder/);
  assert.match(screen,/Histórico protegido/);
  assert.match(screen,/inspectOrderDeletion\(order\.id\)/);
});
test('SQL apaga somente OS intacta usando ID e timestamp esperado',()=>{
  const db=fs.readFileSync(new URL('../src/db.ts',import.meta.url),'utf8');
  assert.match(db,/DELETE FROM work_orders WHERE id=\? AND updated_at=\? AND status='pending'/);
  for(const protectedTable of ['executions','order_events','route_corrective_links']){
    assert.match(db,new RegExp('NOT EXISTS\\(SELECT 1 FROM '+protectedTable+' '));
  }
});
