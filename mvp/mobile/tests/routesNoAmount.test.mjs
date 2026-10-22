import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const load=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('rotas: cadastro, execução e histórico visual não pedem quantidade de lubrificante',()=>{
  const screen=load('src/RoutesScreen.tsx');
  const app=load('App.tsx');
  for(const fragment of ['Quantidade aplicada','Quantidade prevista','setGrams','quantity_grams','gramas)'])
    assert.ok(!screen.includes(fragment),fragment);
  assert.ok(!app.includes("item.quantity_grams+' g'"));
  assert.ok(screen.includes('Lubrificante utilizado'));
  assert.ok(screen.includes('▶ Continuar rota'));
  assert.ok(screen.includes('Ver todos os'));
});

test('PDF de rota e consolidado não exibem quantidades',()=>{
  const routePdf=load('src/routeReport.ts');
  const consolidated=load('src/consolidatedReportModel.ts');
  for(const source of [routePdf,consolidated]){
    assert.ok(!source.includes('<th>Quantidade</th>'));
    assert.ok(!source.includes('quantity_grams'));
  }
  assert.ok(routePdf.includes('Lubrificante'));
  assert.ok(consolidated.includes('Lubrificante'));
});

test('SQLite continua compatível com backups antigos sem apagar histórico',()=>{
  const routes=load('src/routes.ts');
  const backup=load('src/types.ts');
  assert.ok(routes.includes('quantity_grams:number'));
  assert.ok(routes.includes('quantity_grams=CASE WHEN status=\'pending\' THEN 0 ELSE quantity_grams END'));
  assert.ok(routes.includes('quantity_grams=0,recorded_at'));
  assert.ok(routes.includes('point.lubricant,0,point.position'));
  assert.ok(backup.includes('version: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10'));
});
