import test from 'node:test';
import assert from 'node:assert/strict';
import {noticeInputs,previewPlannedReminders} from '../src/reminderPreview.ts';

const when=new Date(2026,9,26,6,0);
const orders=[
 {id:'o1',title:'Quadro',due_date:'2026-10-26',block_reason:'',
  status:'pending',priority:'Alta',category:'Elétrica',asset_code:'Q-1'},
 {id:'o2',title:'OS concluída',due_date:'2026-10-26',block_reason:'',
  status:'completed',priority:'Alta',category:'Mecânica',asset_code:'M-2'},
 {id:'o3',title:'Inspeção pendente',due_date:'2026-10-20',block_reason:'Sem liberação',
  status:'pending',priority:'Média',category:'Inspeção',asset_code:'IN-3'},
];
const routes=[{id:'r1',title:'Rota atenção',next_due_date:null,attention_count:1}];
test('OS e rotas geram o mesmo tipo de entrada usado nos avisos reais',()=>{
 const data=noticeInputs(orders,routes);
 assert.equal(data.length,4);
 assert.deepEqual(data.map(x=>x.type),['order','order','order','route']);
 assert.equal(data[0].assetCode,'Q-1');
 assert.equal(data[1].completed,true);
 assert.equal(data[3].attentionCount,1);
});
test('prévia inclui alertas reais, mas jamais notifica sobre OS concluída',()=>{
 const inputs=noticeInputs(orders,routes);
 const list=previewPlannedReminders(inputs,when,7,30,40);
 assert.ok(list.some(x=>x.kind==='blocked'));
 assert.ok(list.some(x=>x.kind==='attention'));
 assert.ok(list.some(x=>x.kind==='high'));
 assert.ok(list.every(x=>!x.title.includes('OS concluída')));
 assert.ok(list.every(x=>new Date(x.at).getTime()>when.getTime()));
});
test('horário e ordem da prévia são previsíveis, sem modificar entrada',()=>{
 const inp=noticeInputs(orders,routes),before=JSON.stringify(inp);
 const rows=previewPlannedReminders(inp,when,7,25,7);
 assert.equal(rows.length,7);
 assert.ok(rows.every((x,i)=>i===0||new Date(rows[i-1].at)<=new Date(x.at)));
 assert.equal(rows[0].at,new Date(2026,9,26,7,25).toISOString());
 assert.equal(JSON.stringify(inp),before);
});
test('prévia valida limites e não cria itens fictícios',()=>{
 const inp=noticeInputs([],[]);
 const p=previewPlannedReminders(inp,when,7,30,7);
 assert.equal(p.length,7); // somente resumos de calendário, sem apontamentos
 assert.equal(p.filter(x=>x.kind!=='daily').length,0);
 assert.throws(()=>previewPlannedReminders(inp,when,7,30,0),/Limite/);
 assert.throws(()=>previewPlannedReminders(inp,when,25,0,7),/Horário/);
});
