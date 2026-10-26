import test from 'node:test';
import assert from 'node:assert/strict';
import {filterExecutionItems,pagedExecutionItems,nextPendingItem,photosByRouteItem} from '../src/routeExecutionView.ts';

const rows=Array.from({length:100},(_,i)=>({
 id:'r'+i,status:i===13?'anomaly':i===14?'skipped':i%3===0?'done':'pending',
 point_title:i%2===0?'Inspecionar motor':'Verificar segurança',
 asset_label:`T-${i+1} · Área de Miúdos`,
}));
test('busca pontual em rota longa, sem excluir registros',()=>{
 const raw=[...rows];const result=filterExecutionItems(rows,'pending','MIUDOS verificar');
 assert.ok(result.length>0);
 assert.ok(result.every(x=>x.status==='pending'&&x.point_title==='Verificar segurança'));
 assert.deepEqual(rows,raw);
});
test('filtro de ocorrência só mostra anomalia e não executado',()=>{
 assert.deepEqual(filterExecutionItems(rows,'attention','').map(x=>x.id),['r13','r14']);
});
test('paginação mantém ordem, e próximo pendente nunca conclui nada',()=>{
 const visible=filterExecutionItems(rows,'pending','');
 assert.equal(pagedExecutionItems(visible,12).length,12);
 assert.equal(pagedExecutionItems(visible,1000).length,visible.length);
 assert.equal(nextPendingItem(rows)?.id,'r1');
 assert.equal(nextPendingItem([{status:'done'}]),null);
});
test('fotos são agrupadas uma vez, sem perder a ordem e sem misturar pontos',()=>{
 const photos=[
 {id:'1',item_id:'r1',filename:'a.jpg',mime_type:'image/jpeg',created_at:'d'},
 {id:'2',item_id:'r2',filename:'b.jpg',mime_type:'image/jpeg',created_at:'d'},
 {id:'3',item_id:'r1',filename:'c.jpg',mime_type:'image/jpeg',created_at:'d'}
 ];
 const groups=photosByRouteItem(photos);
 assert.deepEqual(groups.get('r1')?.map(x=>x.id),['1','3']);
 assert.deepEqual(groups.get('r2')?.map(x=>x.id),['2']);
});
