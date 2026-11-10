import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMpRows} from '../src/mpImport.ts';
import {addMonths} from '../src/logic.ts';
import {completionPlan} from '../src/operations.ts';

const headings=['Site','MP','Descrição','Posição','Ativo','Descrição Ativo','Freqüência',
  'Unidades de Freqüência','Data Prevista','Data Reprogramada','Duração','Última OS criada'];
function line({mp,title,days=30,date=46430,reDate=46432,duration='1:00',asset='39',os='123456789'}){
  return ['TEST',mp,title,'100-02','000-01',asset,days,'DAYS',date,reDate,duration,os];
}
test('importação da exportação de MPs identifica códigos, ativo, tempo e data (sem hora)',()=>{
  const result=parseMpRows([headings,line({mp:'MP00010',title:'MPL MENSAL MECANICA BOMBA TESTE',asset:'BOMBA 1',duration:'3:00'})]);
  const mp=result.items[0];
  assert.equal(mp.mp_code,'MP00010');
  assert.equal(mp.category,'Mecânica');
  assert.equal(mp.asset_label,'BOMBA 1');
  assert.equal(mp.duration_minutes,180);
  assert.equal(mp.recurrence_days,30);
  assert.equal(mp.recurrence_months,1);
  assert.match(mp.due_date,/^\d{4}-\d{2}-\d{2}$/);
  assert.equal(mp.last_os_number,'123456789');
  assert.equal(result.rejected.length,0);
});
test('quadrimestral usa meses de calendário somente se frequência corresponder ao título',()=>{
  const r=parseMpRows([headings,
    line({mp:'MP00011',title:'MPL QUADRIMESTRAL TESTE',days:120}),
    line({mp:'MP00012',title:'MPL MENSAL TESTE',days:15}),
    line({mp:'MP00013',title:'MPL TROCA DE ÓLEO LONGA',days:1080})
  ]);
  assert.equal(r.items[0].recurrence_months,4);
  assert.equal(r.items[1].recurrence_months,0);
  assert.match(r.items[1].warning,/divergentes/);
  assert.equal(r.items[2].recurrence_days,1080);
  assert.equal(r.items[2].recurrence_months,0);
});
test('dados ausentes não geram vencimento inventado nem máquina fictícia',()=>{
  const r=parseMpRows([headings,
    line({mp:'MP00014',title:'MPL SEMANAL TESTE',days:7,date:'39',reDate:'39',asset:'39',os:'39'})
  ]);
  assert.equal(r.items[0].due_date,null);
  assert.equal(r.items[0].asset_label,'');
  assert.equal(r.items[0].last_os_number,'');
  assert.match(r.items[0].warning,/Sem data/);
});
test('evita MP repetida e linhas com frequência inválida',()=>{
  const r=parseMpRows([headings,
    line({mp:'MP00015',title:'MPL SEMANAL TESTE',days:7}),
    line({mp:'MP00015',title:'MPL SEMANAL TESTE',days:7}),
    line({mp:'MP00016',title:'MPL TESTE',days:0}),
  ]);
  assert.equal(r.items.length,1);
  assert.equal(r.rejected.length,2);
});
test('não tenta importar arquivos sem cabeçalho obrigatório',()=>{
  assert.throws(()=>parseMpRows([['MP','Outro'],['MP10','X']]),/Colunas obrigatórias/);
});
test('mês de calendário tem tratamento de fim de mês e ano bissexto',()=>{
  assert.equal(addMonths('2027-01-31',1),'2027-02-28');
  assert.equal(addMonths('2028-01-31',1),'2028-02-29');
  assert.equal(addMonths('2026-10-31',4),'2027-02-28');
  assert.equal(addMonths('2026-12-31',1),'2027-01-31');
});
test('conclusão após vencimento usa data de execução e preserva recorrência de mês',()=>{
  const order={id:'mp-1',status:'pending',block_reason:'',due_date:'2026-08-01',
    updated_at:'2026-08-01T00:00:00Z',recurrence_days:30,recurrence_months:1};
  assert.deepEqual(completionPlan(order,{...order},'2026-11-30'),{nextDue:'2026-12-30'});
  assert.throws(()=>completionPlan(order,{...order,recurrence_months:2},'2026-11-30'),/mudou/);
});
