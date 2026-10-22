import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('telas de rotas multidisciplinares não solicitam materiais nem quantidade',()=>{
  const screen=read('src/RoutesScreen.tsx');
  const history=read('App.tsx');
  for(const token of ['lubricant','Lubrificante','NEVASTANE','setGrams','Quantidade aplicada','Quantidade prevista','Engraxar mancal']){
    assert.ok(!screen.includes(token),`Campo de rota indevido: ${token}`);
  }
  assert.ok(!history.includes('item.lubricant'));
  assert.ok(screen.includes('Inspecionar motor, verificar proteção ou testar sensores'));
  assert.ok(screen.includes('▶ Continuar rota'));
  assert.ok(screen.includes('Ver todos os'));
});

test('PDF de rota e consolidado não exibem produto ou quantidade',()=>{
  const routePdf=read('src/routeReport.ts');
  const consolidated=read('src/consolidatedReportModel.ts');
  const query=read('src/consolidatedReport.ts');
  for(const source of [routePdf,consolidated]){
    for(const token of ['<th>Quantidade</th>','quantity_grams','lubricant','Lubrificante'])
      assert.ok(!source.includes(token),token);
  }
  assert.ok(!query.includes('i.lubricant'));
});

test('SQLite preserva campos históricos só para compatibilidade do backup v10',()=>{
  const routes=read('src/routes.ts');
  const schema=read('src/types.ts');
  const quick=read('src/quickRouteActions.ts');
  assert.ok(routes.includes('lubricant:string'));
  assert.ok(routes.includes('quantity_grams:number'));
  assert.ok(routes.includes("VALUES(?,?,?,?,?,?,?)`,id(),routeId,assetId,task,'',0"));
  assert.ok(routes.includes("id(),runId,point.id,point.title,label,'',0"));
  assert.ok(routes.includes("quantity_grams=CASE WHEN status='pending' THEN 0 ELSE quantity_grams END"));
  assert.ok(!routes.includes('notes=?,lubricant=?'));
  assert.ok(!quick.includes('lubricant'));
  assert.ok(schema.includes('version: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10'));
});
