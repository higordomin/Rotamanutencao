import test from 'node:test';
import assert from 'node:assert/strict';
import {filterCompletedExecutions} from '../src/completedExecutions.ts';

const base={
  result:'completed',order_title:'Lubrificação do motor',asset_label:'M-101 · Motor · Linha 1',
  category:'Lubrificação',notes:'Graxa aplicada',executed_at:'2026-10-21T10:00:00.000Z',
  previous_due_date:'2026-10-21',next_due_date:'2026-11-20',
};
test('concluídas lista execução de OS recorrente que já voltou a pendente',()=>{
  const results=filterCompletedExecutions([
    {...base,id:'exec1',orderStatusNow:'pending'},
    {...base,id:'exec2',result:'partial'},
  ],'');
  assert.deepEqual(results.map(x=>x.id),['exec1']);
});
test('não inclui execução parcial nem cria conclusão para OS só cadastrada',()=>{
  const data=[{...base,id:'partial',result:'partial'}];
  assert.equal(filterCompletedExecutions(data,'').length,0);
  assert.equal(filterCompletedExecutions([],'').length,0);
});
test('busca histórica aceita nome, TAG, setor, categoria, nota e data',()=>{
  const records=[{...base,id:'done'}];
  for(const term of ['motor','m-101','linha 1','lubrificação','graxa','21/10/2026','2026-10-21']){
    assert.equal(filterCompletedExecutions(records,term).length,1,term);
  }
  assert.equal(filterCompletedExecutions(records,'não consta').length,0);
});
test('preserva execuções múltiplas de mesma OS e não altera os dados de origem',()=>{
  const input=[{...base,id:'a'}, {...base,id:'b',executed_at:'2026-10-15T11:00:00Z'}];
  const before=JSON.stringify(input);
  assert.deepEqual(filterCompletedExecutions(input,'').map(x=>x.id),['a','b']);
  assert.equal(JSON.stringify(input),before);
});
test('histórico concluído inclui atividades avulsas sem próximo prazo',()=>{
  const records=[{...base,id:'single',next_due_date:null}];
  assert.equal(filterCompletedExecutions(records,'').length,1);
});
