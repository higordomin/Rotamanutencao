import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  RECURRENCE_PRESETS,recurrencePreset,recurrenceSummary,
  validRecurrenceInput,MAX_RECURRENCE_DAYS,
} from '../src/recurrencePresets39.ts';
import {addDays} from '../src/logic.ts';

test('uma vez e oito periodicidades solicitadas aparecem em ordem',()=>{
  assert.deepEqual(RECURRENCE_PRESETS.map(x=>x.label),[
    'Uma vez','Diária','Semanal','Mensal','Bimestral','Trimestral',
    'Quadrimestral','Semestral','Anual',
  ]);
  assert.deepEqual(RECURRENCE_PRESETS.map(x=>x.days),[0,1,7,30,60,90,120,180,365]);
  assert.equal(new Set(RECURRENCE_PRESETS.map(x=>x.days)).size,RECURRENCE_PRESETS.length);
});

test('OS existente de 30 dias reaparece como mensal; 0 significa avulsa',()=>{
  assert.equal(recurrenceSummary('30'),'Mensal · a cada 30 dias');
  assert.equal(recurrenceSummary('0'),'Uma vez (sem repetição)');
  assert.equal(recurrenceSummary('1'),'Diária · a cada 1 dia');
  assert.equal(recurrenceSummary('365'),'Anual · a cada 365 dias');
  assert.equal(recurrencePreset(30)?.label,'Mensal');
});

test('intervalos antigos personalizados permanecem sem perda e aceitam até 36500 dias',()=>{
  for(const days of [2,15,21,31,45,75,150,370,MAX_RECURRENCE_DAYS]){
    assert.ok(validRecurrenceInput(String(days)));
    assert.equal(recurrencePreset(days),null);
    assert.match(recurrenceSummary(String(days)),/Personalizado · a cada/);
  }
  for(const bad of ['','-1','1.5','abc','0x10','1e2','36501','99999999999',' 7 ','01a']){
    assert.equal(validRecurrenceInput(bad),false,bad);
  }
});

test('o calendário atual usa intervalos de dias, inclusive nos meses de duração diferente',()=>{
  assert.equal(addDays('2026-01-01',1),'2026-01-02');
  assert.equal(addDays('2026-01-01',7),'2026-01-08');
  assert.equal(addDays('2026-01-01',30),'2026-01-31');
  assert.equal(addDays('2026-01-01',60),'2026-03-02');
  assert.equal(addDays('2026-01-01',90),'2026-04-01');
  assert.equal(addDays('2026-01-01',120),'2026-05-01');
  assert.equal(addDays('2026-01-01',180),'2026-06-30');
  assert.equal(addDays('2026-01-01',365),'2027-01-01');
});

test('formulário recolhe as opções e mantém dias personalizados em campo editável',()=>{
  const component=fs.readFileSync(new URL('../src/RecurrencePicker39.tsx',import.meta.url),'utf8');
  const app=fs.readFileSync(new URL('../App.tsx',import.meta.url),'utf8');
  assert.match(component,/expanded&&<View style=\{s\.choices\}>/);
  assert.match(component,/RECURRENCE_PRESETS\.map\(option/);
  assert.match(component,/Personalizado em dias/);
  assert.match(component,/onChangeText=\{setCustom\}/);
  assert.match(component,/disabled=\{!validRecurrenceInput\(custom\)\}/);
  assert.match(app,/<RecurrencePicker39 value=\{recurrenceInput\} onChange=\{setRecurrenceInput\}/>);
  assert.match(app,/recurrenceSummary\(String\(order\.recurrence_days\)\)/);
  assert.match(app,/!validRecurrenceInput\(recurrenceInput\)/);
});

test('sem alteração de banco ou lembretes: os presets seguem salvando recurrence_days',()=>{
  const app=fs.readFileSync(new URL('../App.tsx',import.meta.url),'utf8');
  const db=fs.readFileSync(new URL('../src/db.ts',import.meta.url),'utf8');
  assert.match(app,/recurrence_days:Number\(recurrenceInput\)/);
  assert.match(db,/input\.recurrence_days/);
});
