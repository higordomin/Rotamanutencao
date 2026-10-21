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

test('backup v5 inclui rota, ponto, execução e checklist consistente',()=>{
  const d=fixture(); d.version=5;
  d.work_orders[0].partial_reason='';d.work_orders[0].partial_at=null;
  d.routes=[{id:'r1',title:'Rota teste',area:'Utilidades',created_at:stamp}];
  d.route_points=[{id:'p1',route_id:'r1',asset_id:'a1',title:'Mancal A',
    lubricant:'NEVASTANE',quantity_grams:3.5,position:0}];
  d.route_runs=[{id:'run1',route_id:'r1',route_title:'Rota teste',started_at:stamp,finished_at:stamp}];
  d.route_run_items=[{id:'ri1',run_id:'run1',point_id:'p1',point_title:'Mancal A',
    asset_label:'MC-01 · Motor',lubricant:'NEVASTANE',quantity_grams:3.5,status:'done',
    notes:'',recorded_at:stamp,position:0}];
  check(d);
  d.route_run_items[0].status='anomaly';
  rejects(d,/Registro de checklist/);
  d.route_run_items[0].notes='Ruído anormal no eixo inferior';
  check(d);
  d.route_run_items[0].status='skipped';
  rejects(d,/Registro de checklist/); // não executado não pode usar os 3,5 g planejados
  d.route_run_items[0].quantity_grams=0;
  check(d);
  d.route_run_items[0].status='pending';
  rejects(d,/Registro de checklist|Execução de rota/);
});
test('backup v5 rejeita referências órfãs em rota e execução',()=>{
  const d=fixture(); d.version=5;
  d.work_orders[0].partial_reason='';d.work_orders[0].partial_at=null;
  d.routes=[{id:'r',title:'Rota',area:'Setor',created_at:stamp}];
  d.route_points=[{id:'p',route_id:'r',asset_id:'a1',title:'Lubrificar',
    lubricant:'',quantity_grams:0,position:0}];
  d.route_runs=[{id:'run',route_id:'r',route_title:'Rota',started_at:stamp,finished_at:null}];
  d.route_run_items=[{id:'item',run_id:'run',point_id:'p',point_title:'Lubrificar',
    asset_label:'A',lubricant:'',quantity_grams:0,status:'pending',notes:'',recorded_at:null,position:0}];
  check(d);
  d.route_points[0].route_id='missing';
  rejects(d,/Ponto de rota/);
  d.route_points[0].route_id='r'; d.route_run_items[0].run_id='missing';
  rejects(d,/Registro de checklist/);
  d.route_run_items[0].run_id='run';
  delete d.route_points;
  rejects(d,/Dados das rotas/);
});

test('backup v6 inclui imagens dos pontos e mantém compatibilidade v5',()=>{
  const d=fixture();d.version=6;
  d.work_orders[0].partial_reason='';d.work_orders[0].partial_at=null;
  d.routes=[{id:'r',title:'Rota foto',area:'Setor',created_at:stamp}];
  d.route_points=[{id:'p',route_id:'r',asset_id:'a1',title:'Mancal',
    lubricant:'Graxa de teste',quantity_grams:2,position:0}];
  d.route_runs=[{id:'run',route_id:'r',route_title:'Rota foto',started_at:stamp,finished_at:stamp}];
  d.route_run_items=[{id:'item',run_id:'run',point_id:'p',point_title:'Mancal',
    asset_label:'MC-01',lubricant:'Graxa de teste',quantity_grams:2,status:'done',
    notes:'Inspecionado',recorded_at:stamp,position:0}];
  const photo={id:'photo1',item_id:'item',filename:'route_01.jpg',
    mime_type:'image/jpeg',created_at:stamp,base64:'/9j/AAAAAA=='};
  d.route_photos=[photo];
  check(d);
  d.route_photos=[...Array.from({length:4},(_,i)=>({...photo,id:'ph'+i,filename:'r'+i+'.jpg'}))];
  check(d);
  d.route_photos.push({...photo,id:'ph5',filename:'r5.jpg'});
  rejects(d,/mais de 4 fotos/);
});
test('backup v6 recusa foto órfã, malformada e arquivo sem coleção obrigatória',()=>{
  const d=fixture();d.version=6;
  d.work_orders[0].partial_reason='';d.work_orders[0].partial_at=null;
  d.routes=[];d.route_points=[];d.route_runs=[];d.route_run_items=[];d.route_photos=[];
  check(d);
  d.route_photos=[{id:'x',item_id:'missing',filename:'a.jpg',mime_type:'image/jpeg',
    created_at:stamp,base64:'/9j/AAAAAA=='}];
  rejects(d,/Foto de ponto inválida/);
  d.route_photos=[];delete d.route_photos;
  rejects(d,/Fotos dos pontos/);
});

test('backup v7 exige campos de programação e preserva fotos dos pontos',()=>{
  const d=fixture();d.version=7;
  d.work_orders[0].partial_reason='';d.work_orders[0].partial_at=null;
  d.routes=[{id:'route',title:'Lubrificação',area:'Setor',created_at:stamp,
    recurrence_days:30,next_due_date:'2026-11-20',attention_count:0,attention_at:null}];
  d.route_points=[{id:'point',route_id:'route',asset_id:'a1',title:'Mancal',
    lubricant:'',quantity_grams:0,position:0}];
  d.route_runs=[{id:'run7',route_id:'route',route_title:'Lubrificação',started_at:stamp,finished_at:stamp}];
  d.route_run_items=[{id:'item7',run_id:'run7',point_id:'point',point_title:'Mancal',
    asset_label:'MC-01',lubricant:'',quantity_grams:0,status:'done',notes:'',
    recorded_at:stamp,position:0}];
  d.route_photos=[{id:'photo7',item_id:'item7',filename:'route_7.jpg',
    mime_type:'image/jpeg',created_at:stamp,base64:'/9j/AAAAAA=='}];
  check(d);
  d.routes[0].attention_count=1;
  rejects(d,/Rota com dados inválidos/);
  d.routes[0].attention_at=stamp;check(d);
  d.routes[0].recurrence_days=0;
  rejects(d,/Rota com dados inválidos/);
  d.routes[0].recurrence_days=30;
  d.routes[0].next_due_date='2026-02-30';
  rejects(d,/Rota com dados inválidos/);
});

test('backup v7 recusa recorrência negativa e exige data da rota preventiva',()=>{
  const d=fixture(); d.version=7;
  d.work_orders[0].partial_reason='';d.work_orders[0].partial_at=null;
  d.routes=[{id:'r1',title:'Rota',area:'A',created_at:stamp,recurrence_days:7,
    next_due_date:null,attention_count:0,attention_at:null}];
  d.route_points=[];d.route_runs=[];d.route_run_items=[];d.route_photos=[];
  rejects(d,/Rota com dados inválidos/);
  d.routes[0].next_due_date='2026-10-21';check(d);
  d.routes[0].recurrence_days=-1;rejects(d,/Rota com dados inválidos/);
});

test('backup v8 preserva arquivo de OS inativa e suas execuções históricas',()=>{
  const d=fixture();d.version=8;
  d.work_orders[0].partial_reason='';d.work_orders[0].partial_at=null;
  d.work_orders[0].archived_at=stamp;
  d.work_orders[0].archive_reason='Equipamento retirado para manutenção prolongada';
  d.routes=[];d.route_points=[];d.route_runs=[];d.route_run_items=[];d.route_photos=[];
  d.executions=[{id:'oldExec',order_id:'ord1',order_title:'Lubrificar motor',
    notes:'Engraxamento realizado',executed_at:stamp,
    previous_due_date:'2026-10-20',next_due_date:'2026-11-19',
    asset_label:'MC-01',category:'Lubrificação',result:'completed'}];
  check(d);
  // Campos de archive de v8 devem sempre estar presentes com coerência interna.
  delete d.work_orders[0].archive_reason;
  rejects(d,/Atividade com dados/);
  d.work_orders[0].archive_reason='Equipamento retirado para manutenção prolongada';
  d.work_orders[0].archived_at=null;
  rejects(d,/Atividade com dados/);
  d.work_orders[0].archive_reason='';
  check(d);
});
test('backup v8 exige justificativa de arquivamento e campos de OS ativas',()=>{
  const d=fixture();d.version=8;
  d.work_orders[0].partial_reason='';d.work_orders[0].partial_at=null;
  d.work_orders[0].archived_at=null;
  d.work_orders[0].archive_reason='';
  d.routes=[];d.route_points=[];d.route_runs=[];d.route_run_items=[];d.route_photos=[];
  check(d);
  d.work_orders[0].archived_at=stamp;
  d.work_orders[0].archive_reason='Curto';
  rejects(d,/Atividade com dados/);
  d.work_orders[0].archive_reason='Retirado definitivamente de uso';
  check(d);
});
test('backup antigo v7 continua importável sem campos de arquivamento',()=>{
  const d=fixture();d.version=7;
  d.work_orders[0].partial_reason='';d.work_orders[0].partial_at=null;
  d.routes=[];d.route_points=[];d.route_runs=[];d.route_run_items=[];d.route_photos=[];
  check(d);
});
