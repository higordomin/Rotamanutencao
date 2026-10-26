import test from 'node:test';
import assert from 'node:assert/strict';
import {scopeReportData,buildConsolidatedHtml,REPORT_SPECIALTIES} from '../src/consolidatedReportModel.ts';

function sample(){
 const at='2026-10-26T12:00:00.000Z';
 return {
  start:'2026-10-25',end:'2026-10-26',generatedAt:at,includedPhotos:true,
  specialty:'Elétrica',
  executions:[
   {id:'el-1',order_title:'Inspeção elétrica',result:'completed',executed_at:at,
    asset_label:'QF-01',category:'Elétrica',notes:'Isolação OK',next_due_date:null},
   {id:'mc-2',order_title:'Troca rolamento',result:'partial',executed_at:at,
    asset_label:'M-02',category:'Mecânica',notes:'Aguardando eixo',next_due_date:null},
  ],
  routeRuns:[{id:'r1',route_title:'Multidisciplinar',started_at:at,finished_at:at}],
  routeItems:[{id:'ri1',run_id:'r1',point_title:'Conferir grade',asset_label:'G-01',status:'anomaly',notes:'Grade solta'}],
  pendingOrders:[
   {id:'p1',title:'Quadro',due_date:'2026-10-20',category:'Elétrica',priority:'Alta',
    block_reason:'Sem energia',partial_reason:'',asset_code:'Q-1',asset_name:'Q1',asset_area:'A'},
   {id:'p2',title:'Válvula',due_date:'2026-10-20',category:'Mecânica',priority:'Alta',
    block_reason:'Peça pendente',partial_reason:'',asset_code:'V-1',asset_name:'V1',asset_area:'B'},
  ],
  photos:[
   {owner_kind:'os',owner_id:'el-1',caption:'Foto painel',mime_type:'image/jpeg',base64:'/9j/'},
   {owner_kind:'os',owner_id:'mc-2',caption:'Foto rolamento',mime_type:'image/jpeg',base64:'/9j/'},
   {owner_kind:'route',owner_id:'ri1',caption:'Foto rota',mime_type:'image/jpeg',base64:'/9j/'},
  ],
 };
}
test('categorias incluem manutenção multidisciplinar sem atribuir tipo à rota',()=>{
 assert.deepEqual(REPORT_SPECIALTIES,
  ['Todas','Mecânica','Elétrica','Inspeção','Segurança','Lubrificação']);
});
test('filtro Elétrica isola OS, pendências e evidências pelo ID',()=>{
 const data=sample();const untouched=JSON.stringify(data);
 const only=scopeReportData(data);
 assert.deepEqual(only.executions.map(e=>e.id),['el-1']);
 assert.deepEqual(only.pendingOrders.map(e=>e.id),['p1']);
 assert.deepEqual(only.photos.map(p=>p.caption),['Foto painel']);
 assert.deepEqual(only.routeRuns,[]);
 assert.deepEqual(only.routeItems,[]);
 assert.equal(JSON.stringify(data),untouched);
 const html=buildConsolidatedHtml(data);
 assert.ok(html.includes('Especialidade: Elétrica'));
 assert.ok(html.includes('Rotas omitidas'));
 assert.ok(html.includes('Inspeção elétrica'));
 assert.ok(!html.includes('Troca rolamento'));
 assert.ok(!html.includes('Válvula'));
 assert.ok(!html.includes('Foto rolamento'));
 assert.ok(!html.includes('Foto rota'));
});
test('Todas mostra OS, rotas e todas as fotos, sem omissão',()=>{
 const data=sample();data.specialty='Todas';
 const scoped=scopeReportData(data);
 assert.equal(scoped,data);
 const html=buildConsolidatedHtml(data);
 assert.ok(html.includes('Multidisciplinar'));
 assert.ok(html.includes('Troca rolamento'));
 assert.ok(html.includes('Foto rota'));
});
test('especialidade inválida falha de modo explícito',()=>{
 const data=sample();
 data.specialty='<script>';
 assert.throws(()=>scopeReportData(data),/Especialidade inválida/);
});
test('filtro sem dados relacionados não revela dados de outra área',()=>{
 const data=sample();data.specialty='Segurança';
 assert.throws(()=>buildConsolidatedHtml(data),/Não há registros/);
});
