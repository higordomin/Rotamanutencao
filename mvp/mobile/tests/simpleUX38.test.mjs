import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FIRST_USE_STEPS} from '../src/firstUse34.ts';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('usuário novo aprende o fluxo em dois passos, sem obrigar cadastro de TAG',()=>{
  assert.equal(FIRST_USE_STEPS.length,2);
  assert.match(FIRST_USE_STEPS[0].description,/opcional/);
  assert.match(FIRST_USE_STEPS[1].description,/aparelho/);
});

test('início concentra a criação de OS e não replica indicadores da agenda',()=>{
  const source=read('src/HomeScreen.tsx');
  assert.match(source,/>＋ Criar OS</);
  assert.match(source,/>Ver todas as minhas OS</);
  assert.match(source,/>Abrir serviço</);
  assert.doesNotMatch(source,/s\.metrics|s\.metricValue|routes:\s*Route\[\]/);
});

test('lista de ordens revela apenas serviço e mais opções, mantendo exclusão segura',()=>{
  const source=read('App.tsx');
  assert.match(source,/label=\{blocked\?'Liberar':'Registrar serviço'\}/);
  assert.match(source,/label=\{expanded\?'Ocultar detalhes':'Mais opções'\}/);
  assert.match(source,/expanded&&<View style=\{styles\.orderExtras\}>/);
  assert.match(source,/label="Excluir OS"/);
  assert.match(source,/confirmDeleteOrder\(order\)/);
});

test('busca por setor é imediata e filtros extras ficam recolhidos',()=>{
  const source=read('App.tsx');
  assert.match(source,/placeholder="Buscar OS ou setor/);
  assert.match(source,/showOrderFilters&&<View/);
  assert.match(source,/\['Impedidas','Prioritárias','Arquivadas'\]/);
});

test('ordem mensal aceita muitas TAGs em texto, sem exigir qualquer equipamento cadastrado',()=>{
  const source=read('App.tsx');
  const db=read('src/db.ts');
  assert.match(source,/Descrição ou lista de equipamentos \(opcional\)/);
  assert.match(source,/Para OS com dezenas de equipamentos, escreva a lista na descrição/);
  assert.match(source,/<RecurrencePicker39 value=\{recurrenceInput\} onChange=\{setRecurrenceInput\}/);
  assert.match(read('src/recurrencePresets39.ts'),/label:'Mensal',days:30/);
  assert.match(source,/<AssetPicker assets=\{assets\} value=\{orderDraft\.asset_id\} allowNone/);
  // A OS continua independente de equipamento: o banco aceita asset_id nulo.
  assert.match(db,/asset_id TEXT REFERENCES assets\(id\) ON DELETE SET NULL/);
  assert.doesNotMatch(db,/if\(!input\.asset_id\)/);
});

test('máquinas críticas podem ser cadastradas dentro da OS e o rascunho é preservado',()=>{
  const source=read('App.tsx');
  assert.match(source,/const openAssetFromOrder=\(\)=>/);
  assert.match(source,/setAssetDraft\(\{name:'',code:'',area:orderDraft\.sector\}\)/);
  assert.match(source,/if\(returnToOrderFromAsset\)/);
  assert.match(source,/label="＋ Cadastrar equipamento prioritário"/);
  assert.match(source,/saveAsset\(assetDraft, editingAsset\),finishAssetSave/);
});
