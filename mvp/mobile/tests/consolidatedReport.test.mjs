import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateReportPeriod,reportSummary,buildConsolidatedHtml,
  MAX_REPORT_DAYS,MAX_REPORT_PHOTOS,
} from '../src/consolidatedReportModel.ts';

const stamp='2026-10-21T16:00:00.000Z';
function sample(){
  return {
    start:'2026-10-19',end:'2026-10-21',generatedAt:stamp,includedPhotos:false,photos:[],
    executions:[
      {id:'e1',order_title:'Lubrificação <mancal>',result:'completed',
        executed_at:stamp,asset_label:'EQ-101 · Motor & Transmissão',
        category:'Lubrificação',notes:'Graxa aplicada <ok>',next_due_date:'2026-11-20'},
      {id:'e2',order_title:'Bomba',result:'partial',executed_at:stamp,
        asset_label:'EQ-102',category:'Mecânica',
        notes:'Aguardando substituição de peça',next_due_date:null},
    ],
    routeRuns:[{id:'r1',route_title:'Linha & Área',started_at:stamp,finished_at:stamp}],
    routeItems:[
      {id:'i1',run_id:'r1',point_title:'Mancal A',asset_label:'EQ-101',status:'done',
        lubricant:'HD2T',quantity_grams:3.5,notes:''},
      {id:'i2',run_id:'r1',point_title:'Mancal B',asset_label:'EQ-102',status:'anomaly',
        lubricant:'HD2T',quantity_grams:0,notes:'Vazamento detectado'},
      {id:'i3',run_id:'r1',point_title:'Mancal C',asset_label:'EQ-103',status:'skipped',
        lubricant:'',quantity_grams:0,notes:'Ponto inacessível'},
    ],
    pendingOrders:[{id:'o1',title:'Manutenção pendente',due_date:'2026-10-17',
      priority:'Alta',block_reason:'Falta peça',partial_reason:'',asset_code:'EQ-101',
      asset_name:'Motor',asset_area:'Linha 1'}],
  };
}
test('validação de período usa dias civis (inclusive ano bissexto)',()=>{
  assert.equal(validateReportPeriod('2024-02-28','2024-03-01'),3);
  assert.equal(validateReportPeriod('2026-10-21','2026-10-21'),1);
  assert.equal(validateReportPeriod('2026-01-01','2026-03-31'),MAX_REPORT_DAYS);
  assert.throws(()=>validateReportPeriod('2026-10-22','2026-10-21'),/anterior/);
  assert.throws(()=>validateReportPeriod('2026-01-01','2026-04-01'),/90/);
  assert.throws(()=>validateReportPeriod('2026-02-30','2026-03-01'),/válidas/);
});
test('resumo conta execuções parciais, finalizadas e anomalias sem confundir OS',()=>{
  assert.deepEqual(reportSummary(sample()),{
    osConcluidas:1,osParciais:1,rotasFinalizadas:1,pontosExecutados:1,
    anomalias:1,pontosNaoExecutados:1,pontosPendentes:0,pendenciasAtuais:1,fotos:0,
  });
});
test('PDF HTML contém relatórios, período, dados e aviso do retrato atual',()=>{
  const html=buildConsolidatedHtml(sample());
  for(const part of ['Relatório consolidado','Ordens de serviço executadas','Rotas finalizadas',
    'Pendências atuais','Vazamento detectado','não representam o histórico','Fotos não incluídas']){
    assert.ok(html.includes(part),part);
  }
  assert.ok(html.includes('19/10/2026'));
  assert.ok(html.includes('21/10/2026'));
});
test('relatórios novos não exibem campos de produto ou quantidade de rotas',()=>{
  const d=sample();
  const html=buildConsolidatedHtml(d);
  assert.ok(!html.includes('<th>Lubrificante</th>'));
  assert.ok(!html.includes('HD2T'));
  assert.ok(!html.includes('<th>Quantidade</th>'));
  assert.ok(!html.includes('3.50 g'));
  assert.ok(!html.includes('3.5 g'));
});

test('escapa entradas de texto de OS e rota evitando HTML embutido no relatório',()=>{
  const html=buildConsolidatedHtml(sample());
  assert.ok(html.includes('Lubrificação &lt;mancal&gt;'));
  assert.ok(html.includes('Motor &amp; Transmissão'));
  assert.ok(html.includes('Graxa aplicada &lt;ok&gt;'));
  assert.ok(!html.includes('<mancal>'));
});
test('fotos inclusas exigem MIME e base64 válidos; sem fotos não aceita anexos',()=>{
  const d=sample();
  d.includedPhotos=true;
  d.photos=[{owner_kind:'os',owner_id:'e1',mime_type:'image/png',
    base64:'iVBORw0KGgoAAA==',caption:'Foto motor & inspeção'}];
  let html=buildConsolidatedHtml(d);
  assert.ok(html.includes('data:image/png;base64,iVBORw0KGgoAAA=='));
  assert.ok(html.includes('Foto motor &amp; inspeção'));
  d.photos[0].mime_type='image/svg+xml';
  assert.throws(()=>buildConsolidatedHtml(d),/Imagem inválida/);
  d.photos[0].mime_type='image/png';
  d.includedPhotos=false;
  assert.throws(()=>buildConsolidatedHtml(d),/sem fotos/);
});
test('limites explícitos impedem geração silenciosamente truncada',()=>{
  const d=sample();
  d.routeItems=Array.from({length:301},(_,i)=>({...d.routeItems[0],id:'i'+i}));
  assert.throws(()=>buildConsolidatedHtml(d),/Muitos registros/);
  d.routeItems=[];
  d.includedPhotos=true;
  d.photos=Array.from({length:MAX_REPORT_PHOTOS+1},(_,i)=>({
    owner_kind:'route',owner_id:'i1',mime_type:'image/jpeg',base64:'/9j/',caption:'foto '+i,
  }));
  assert.throws(()=>buildConsolidatedHtml(d),/Muitas fotos/);
});
test('não gera relatório vazio e não altera os registros recebidos',()=>{
  const d=sample();
  const before=JSON.stringify(d);
  buildConsolidatedHtml(d);
  assert.equal(JSON.stringify(d),before);
  d.executions=[];d.routeRuns=[];d.pendingOrders=[];
  assert.throws(()=>buildConsolidatedHtml(d),/Não há registros/);
});
