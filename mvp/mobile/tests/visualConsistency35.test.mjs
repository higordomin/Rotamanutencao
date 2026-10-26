import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {INDUSTRIAL,INTERACTION,SPACING,TYPE,RADII,STATUS_TONE} from '../src/design31.ts';

const screenFiles=[
  'App.tsx','src/HomeScreen.tsx','src/MoreMenu.tsx','src/FirstUseGuide.tsx',
  'src/OperationalAgenda.tsx','src/RoutesScreen.tsx','src/AssetPicker.tsx',
  'src/CalendarPicker.tsx','src/ConsolidatedReportPanel.tsx',
  'src/ReminderSettings.tsx',
];

test('todas as dez telas de interface visual usam os mesmos tokens',()=>{
  for(const path of screenFiles){
    const source=fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
    assert.match(source,/design31/,path+' não importa o tema');
    assert.doesNotMatch(source,/#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?\b/,
      path+' tem cor hexadecimal particular (use design31)');
  }
});
test('identidade Industrial Dark mantém estados sem cores contraditórias',()=>{
  assert.equal(STATUS_TONE.overdue,INDUSTRIAL.danger);
  assert.equal(STATUS_TONE.attention,INDUSTRIAL.caution);
  assert.equal(STATUS_TONE.blocked,INDUSTRIAL.caution);
  assert.equal(STATUS_TONE.completed,INDUSTRIAL.success);
  assert.equal(STATUS_TONE.scheduled,INDUSTRIAL.accent);
});
test('elementos e controles compartilham tamanho e legibilidade base',()=>{
  assert.ok(INTERACTION.minTouch>=48);
  assert.ok(TYPE.caption>=12);
  assert.ok(TYPE.body>=14);
  assert.ok(SPACING.screen>=16);
  assert.ok(RADII.card>=RADII.chip);
});
test('cores de sistema Android combinam com a identidade visual',()=>{
  const config=JSON.parse(fs.readFileSync(new URL('../app.json',import.meta.url),'utf8')).expo;
  assert.equal(config.android.adaptiveIcon.backgroundColor,INDUSTRIAL.background);
  const notification=config.plugins.find(plugin=>Array.isArray(plugin)&&plugin[0]==='expo-notifications');
  assert.equal(notification[1].color,INDUSTRIAL.accent);
});
