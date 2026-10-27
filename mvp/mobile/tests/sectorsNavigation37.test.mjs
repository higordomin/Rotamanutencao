import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {knownSectors,matchesSector,orderSector,sectorSuggestions,sectorKey,cleanSector} from '../src/sectors37.ts';
import {bottomTabs} from '../src/navigation31.ts';

test('navegação principal não mostra Rotas',()=>{
  assert.deepEqual(bottomTabs.map(t=>t.label),['Início','Agenda','Atividades','Mais']);
  const screen=fs.readFileSync(new URL('../App.tsx',import.meta.url),'utf8');
  assert.doesNotMatch(screen,/tab === 'Rotas'/);
  assert.doesNotMatch(screen,/RoutesScreen/);
  assert.match(screen,/routes=\{\[\]\}/);
});
test('setor da OS independe de equipamento e aceita nomes antigos de TAG',()=>{
  assert.equal(orderSector({sector:'Sala de Cortes',asset_area:'Paletização'}),'Sala de Cortes');
  assert.equal(orderSector({sector:'',asset_area:'Evisceração'}),'Evisceração');
  assert.equal(orderSector({sector:'Inspeção geral',asset_area:null}),'Inspeção geral');
});
test('pesquisa setores por nome parcial, sem acentos e sem distinção de maiúsculas',()=>{
  assert.ok(matchesSector('Sala de Cortes','sala de cortes'));
  assert.ok(matchesSector('SALÁ  DE CORTES','sala de cortes'));
  assert.ok(matchesSector('Sala de Cortes 01','cortes'));
  assert.ok(matchesSector('Sala de Cortes','de sala'));
  assert.equal(matchesSector('Embalagem','Sala de Cortes'),false);
  assert.equal(sectorKey('  COŔTES  '),'cortes');
  assert.equal(cleanSector('  Sala    de Cortes   '),'Sala de Cortes');
});
test('centenas de setores cadastrados não geram centenas de botões',()=>{
  const sectors=Array.from({length:350},(_,i)=>({sector:'Setor '+i}));
  sectors.push({sector:'Sala de Cortes'},{sector:'SALA DE CORTES'});
  const names=knownSectors(sectors,[{area:'Embalagem'}]);
  assert.equal(names.filter(s=>sectorKey(s)==='sala de cortes').length,1);
  assert.equal(names.length,352);
  assert.equal(sectorSuggestions(names,'setor',6).length,6);
  assert.ok(sectorSuggestions(names,'sala de cortes').includes('Sala de Cortes'));
});
test('OS exigem setor ao criar e preservam o campo ao duplicar',()=>{
  const db=fs.readFileSync(new URL('../src/db.ts',import.meta.url),'utf8');
  const duplicate=fs.readFileSync(new URL('../src/operatorActions.ts',import.meta.url),'utf8');
  assert.match(db,/const sector = cleanSector\(input\.sector\)/);
  assert.match(db,/Escolha ou informe o setor da OS/);
  assert.match(db,/ALTER TABLE work_orders ADD COLUMN sector/);
  assert.match(duplicate,/sector: order\.sector/);
});
test('backup v12 preserva setor e mantém dados de rotas históricos',()=>{
  const backup=fs.readFileSync(new URL('../src/backup.ts',import.meta.url),'utf8');
  const validation=fs.readFileSync(new URL('../src/backupValidation.ts',import.meta.url),'utf8');
  const db=fs.readFileSync(new URL('../src/db.ts',import.meta.url),'utf8');
  assert.match(backup,/version: 12/);
  assert.match(validation,/10, 11, 12/);
  assert.match(db,/route_corrective_links/);
  assert.match(db,/cleanSector\(o\.sector \|\| data\.assets/);
});
