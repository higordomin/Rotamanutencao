import test from 'node:test';
import assert from 'node:assert/strict';
import {agendaPreviewRows,agendaVisualLabel,agendaVisualStatus} from '../src/agendaVisual.ts';

const entry=(id,more={})=>({id,kind:'order',title:id,area:'Produção',
  dueDate:'2026-10-22',subtitle:'Lubrificação',specialty:'Lubrificação',
  priority:'Média',attention:false,blocked:false,partial:false,
  overdue:false,today:true,unscheduled:false,...more});

test('prévia compacta só mostra cinco serviços e preserva ordem sem mutar dados',()=>{
  const original=Array.from({length:19},(_,i)=>entry('os-'+i));
  const rows=agendaPreviewRows(original);
  assert.deepEqual(rows.map(x=>x.id),['os-0','os-1','os-2','os-3','os-4']);
  assert.equal(original.length,19);
  assert.deepEqual(agendaPreviewRows(original,true),original);
  assert.notEqual(agendaPreviewRows(original,true),original);
});

test('a prévia respeita limite de linhas e não inventa novas atividades',()=>{
  const list=[entry('a'),entry('b'),entry('c')];
  assert.deepEqual(agendaPreviewRows(list,false,2).map(x=>x.id),['a','b']);
  assert.deepEqual(agendaPreviewRows([],false),[]);
  for(const bad of [0,-1,1.5,101,NaN])
    assert.throws(()=>agendaPreviewRows(list,false,bad),/Limite/);
});

test('uma ocorrência vencida tem a cor/legenda de atraso antes de alerta',()=>{
  const x=entry('x',{overdue:true,attention:true,blocked:true,today:false});
  assert.equal(agendaVisualStatus(x),'overdue');
  assert.equal(agendaVisualLabel(x),'Atrasada');
});

test('bloqueio e anomalia permanecem distintos de OS programadas',()=>{
  assert.equal(agendaVisualLabel(entry('blocked',{blocked:true})),'Impedida');
  assert.equal(agendaVisualLabel(entry('anomaly',{attention:true,kind:'route'})),'Anomalia');
  assert.equal(agendaVisualLabel(entry('partial',{attention:true,partial:true})),'Pendente de retorno');
});

test('legendas de dia atual e programação futura respeitam datas existentes',()=>{
  assert.equal(agendaVisualLabel(entry('today')),'Hoje');
  assert.equal(agendaVisualLabel(entry('future',{today:false,dueDate:'2026-11-03'})),'Programada');
});
