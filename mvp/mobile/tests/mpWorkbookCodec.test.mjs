import test from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,strToU8} from 'fflate';
import {xlsxRows,csvRows,base64Bytes} from '../src/mpWorkbookCodec.ts';
import {parseMpRows} from '../src/mpImport.ts';

test('decoder XLSX lê arquivo Excel real compactado (shared strings, células numéricas e horas)',()=>{
  const strings=['MP','Descrição','Freqüência','Unidades de Freqüência','Data Prevista',
    'Data Reprogramada','Duração','Última OS criada','MP00031','MPL MENSAL TESTE','DAYS','1:00','123456789'];
  const shared='<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    strings.map(v=>'<si><t>'+v+'</t></si>').join('')+'</sst>';
  const row1=strings.slice(0,8).map((v,i)=>'<c r="'+String.fromCharCode(65+i)+'1" t="s"><v>'+i+'</v></c>').join('');
  const cells=[
    '<c r="A2" t="s"><v>8</v></c>',
    '<c r="B2" t="s"><v>9</v></c>',
    '<c r="C2" t="n"><v>30</v></c>',
    '<c r="D2" t="s"><v>10</v></c>',
    '<c r="E2" t="n"><v>46345.5</v></c>',
    '<c r="F2" t="n"><v>46346.0</v></c>',
    '<c r="G2" t="s"><v>11</v></c>',
    '<c r="H2" t="s"><v>12</v></c>',
  ].join('');
  const worksheet='<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    '<sheetData><row r="1">'+row1+'</row><row r="2">'+cells+'</row></sheetData></worksheet>';
  const zip=zipSync({'xl/worksheets/sheet1.xml':strToU8(worksheet),
    'xl/sharedStrings.xml':strToU8(shared)});
  const rows=xlsxRows(zip);
  assert.deepEqual(rows[0].slice(0,3),strings.slice(0,3));
  const out=parseMpRows(rows);
  assert.equal(out.items.length,1);
  assert.equal(out.items[0].mp_code,'MP00031');
  assert.equal(out.items[0].duration_minutes,60);
  assert.equal(out.items[0].recurrence_months,1);
  assert.match(out.items[0].due_date,/^\d{4}-\d{2}-\d{2}$/);
});
test('CSV com ponto-e-vírgula e aspas mantém descrição com separador',()=>{
  const csv='MP;Descrição;Freqüência;Unidades de Freqüência;Data Prevista\n'+
    'MP00032;"MPL MENSAL; TESTE";30;DAYS;05/11/2026\n';
  const out=parseMpRows(csvRows(csv));
  assert.equal(out.items[0].title,'MPL MENSAL; TESTE');
  assert.equal(out.items[0].due_date,'2026-11-05');
});
test('decodificação base64 rejeita entrada corrompida',()=>{
  assert.deepEqual(Array.from(base64Bytes('TUE=')),[77,65]);
  assert.throws(()=>base64Bytes('@@@@'),/codificação/);
});
