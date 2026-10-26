import test from 'node:test';
import assert from 'node:assert/strict';
import {pdfDate,pdfDocument,pdfPhotoFigures} from '../src/professionalPdf.ts';
import {buildExecutionReportHtml} from '../src/executionReportModel.ts';
import {buildRouteReportHtml} from '../src/routeReportModel.ts';

const execution={
 id:'e-123',order_title:'Inspeção de válvula <A>',result:'completed',
 executed_at:'2026-10-26T13:30:00.000Z',previous_due_date:'2026-10-24',
 next_due_date:'2026-11-24',asset_label:'EQ-023 · Linha & envase',
 category:'Inspeção',notes:'Conferido <sem vazamento> & em funcionamento',
};
const run={id:'run-123',route_title:'Inspeção área & elétrica',started_at:'2026-10-25T22:00:00.000Z',
 finished_at:'2026-10-25T23:00:00.000Z'};
const items=[
 {id:'1',point_title:'Painel elétrico',asset_label:'TAG-005',position:0,status:'done',notes:'Sem anomalias'},
 {id:'2',point_title:'Correia do motor',asset_label:'TAG-006',position:1,status:'anomaly',notes:'Folga <medir>'},
 {id:'3',point_title:'Proteção móvel',asset_label:'TAG-007',position:2,status:'skipped',notes:'Acesso bloqueado'},
];
test('documento A4 possui identidade uniforme e aviso técnico de segurança',()=>{
 const h=pdfDocument('Relatório <técnico>','Gerado offline','<p>Corpo confiável</p>');
 assert.ok(h.includes('size:A4'));
 assert.ok(h.includes('RotaManutenção | RELATÓRIO TÉCNICO'));
 assert.ok(h.includes('&lt;técnico&gt;'));
 assert.ok(h.includes('Não equivale à assinatura'));
 assert.ok(h.includes('<p>Corpo confiável</p>'));
});
test('datas civis de OS não mudam com timezone e não são inventadas',()=>{
 assert.equal(pdfDate('2026-10-24'),'24/10/2026');
 assert.equal(pdfDate(null),'—');
 assert.equal(pdfDate('inválida'),'inválida');
});
test('PDF da OS preserva especialidade e observações, com proteção contra HTML',()=>{
 const h=buildExecutionReportHtml(execution);
 for(const token of ['Inspeção','TAG','Prazo executado','24/10/2026','Evidências fotográficas','e-123']){
   assert.ok(h.includes(token),token);
 }
 assert.ok(h.includes('Inspeção de válvula &lt;A&gt;'));
 assert.ok(h.includes('Linha &amp; envase'));
 assert.ok(h.includes('Conferido &lt;sem vazamento&gt; &amp; em funcionamento'));
 assert.ok(!h.includes('<A>'));
 assert.ok(!h.includes('Lubrificante usado'));
});
test('execução parcial não é apresentada como concluída, nem reagendada',()=>{
 const h=buildExecutionReportHtml({...execution,result:'partial',next_due_date:'2027-01-01',notes:'Sem peça'});
 assert.ok(h.includes('Parcial — OS pendente'));
 assert.ok(h.includes('Não reagendada'));
 assert.ok(!h.includes('01/01/2027'));
 assert.ok(h.includes('não é comprovante de conclusão'));
 assert.throws(()=>buildExecutionReportHtml({...execution,result:'pending'}),/inválido/);
});
test('PDF da rota diferencia executado, anomalia e não executado sem consumo de lubrificante',()=>{
 const h=buildRouteReportHtml(run,items);
 for(const token of ['Inspeção área &amp; elétrica','Painel elétrico','Folga &lt;medir&gt;',
  'TAG-005','Não executado','Anomalia','Executados','Não equivale à assinatura']){
   assert.ok(h.includes(token),token);
 }
 assert.ok(!h.includes('Quantidade de graxa'));
 assert.ok(!h.includes('<th>Lubrificante</th>'));
});
test('PDF não finge finalização de rotas abertas ou com pendências',()=>{
 assert.throws(()=>buildRouteReportHtml({...run,finished_at:null},items),/Finalize/);
 assert.throws(()=>buildRouteReportHtml(run,[]),/sem pontos/);
 assert.throws(()=>buildRouteReportHtml(run,[{...items[0],status:'pending'}]),/sem registro/);
});
test('imagens válidas são incorporadas com legendas escapadas; MIME/HTML estranhos barrados',()=>{
 const valid={mime_type:'image/png',base64:'iVBORw0KGgoAAA==',caption:'Motor <A> & painel'};
 const h=pdfPhotoFigures([valid]);
 assert.ok(h.includes('data:image/png;base64,iVBORw0KGgoAAA=='));
 assert.ok(h.includes('Motor &lt;A&gt; &amp; painel'));
 assert.throws(()=>pdfPhotoFigures([{...valid,mime_type:'image/svg+xml'}]),/inválida/);
 assert.throws(()=>pdfPhotoFigures([{...valid,base64:'<script>'}]),/inválida/);
 assert.throws(()=>pdfPhotoFigures([{...valid,base64:''}]),/inválida/);
});
test('renderização é pura e preserva a ordem dos 100 pontos de manutenção',()=>{
 const many=Array.from({length:100},(_,i)=>({...items[0],id:'i'+i,point_title:'Ponto '+i,position:i}));
 const before=JSON.stringify(many);
 const h=buildRouteReportHtml(run,many);
 assert.ok(h.indexOf('Ponto 0')<h.indexOf('Ponto 99'));
 assert.equal((h.match(/Ponto \d+/g)||[]).length,100);
 assert.equal(JSON.stringify(many),before);
});
