import {unzipSync, strFromU8} from 'fflate';
import {XMLParser} from 'fast-xml-parser';
import type {MpCell} from './mpImport';

export const MAX_FILE_SIZE=8*1024*1024;
const MAX_WORKSHEET_XML=15*1024*1024;
const asArray=<T,>(v:T|T[]|undefined):T[]=>v===undefined?[]:Array.isArray(v)?v:[v];
const field=(v:unknown)=>v&&typeof v==='object' ? v as Record<string,unknown> : {};
const val=(v:unknown)=>v===null||v===undefined?'':String(v);
export function base64Bytes(input:string):Uint8Array{
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean=input.replace(/\s/g,'');
  if (clean.length%4!==0)throw new Error('Arquivo Excel com codificação inválida.');
  const length=clean.length/4*3-(clean.endsWith('==')?2:clean.endsWith('=')?1:0);
  const out=new Uint8Array(length);
  let p=0;
  for(let i=0;i<clean.length;i+=4){
    const a=alphabet.indexOf(clean[i]),b=alphabet.indexOf(clean[i+1]);
    const c=clean[i+2]==='='?0:alphabet.indexOf(clean[i+2]);
    const d=clean[i+3]==='='?0:alphabet.indexOf(clean[i+3]);
    if(a<0||b<0||c<0||d<0)throw new Error('Arquivo Excel com codificação inválida.');
    const n=(a<<18)|(b<<12)|(c<<6)|d;
    out[p++]=(n>>>16)&255;
    if(p<length)out[p++]=(n>>>8)&255;
    if(p<length)out[p++]=n&255;
  }
  return out;
}
const xml=new XMLParser({ignoreAttributes:false,attributeNamePrefix:'@_',parseTagValue:false,trimValues:false});
function readText(zip:Record<string,Uint8Array>,name:string):string{
  const file=zip[name];
  if(!file)throw new Error('Arquivo Excel incompleto: '+name);
  if(file.byteLength>MAX_WORKSHEET_XML)throw new Error('Conteúdo do Excel excede o tamanho permitido.');
  return strFromU8(file);
}
function itemText(value:unknown):string{
  const obj=field(value);
  if(typeof value==='string'||typeof value==='number')return val(value);
  const direct=obj.t;
  if(direct!==undefined)return val(direct);
  return asArray(obj.r as unknown[]|undefined).map(r=>val(field(r).t)).join('');
}
export function xlsxRows(binary:Uint8Array):MpCell[][] {
  if(binary.length>MAX_FILE_SIZE)throw new Error('Excel acima de 8 MB.');
  let zip:Record<string,Uint8Array>;
  try{zip=unzipSync(binary);}catch{throw new Error('Excel inválido ou compactação corrompida.');}
  const sheets=Object.keys(zip).filter(key=>/^xl\/worksheets\/sheet\d+\.xml$/.test(key))
    .sort((a,b)=>Number(a.match(/sheet(\d+)/)?.[1]??0)-Number(b.match(/sheet(\d+)/)?.[1]??0));
  if(!sheets.length)throw new Error('Nenhuma planilha de dados encontrada no Excel.');
  const sst=zip['xl/sharedStrings.xml']
    ? asArray(field(xml.parse(readText(zip,'xl/sharedStrings.xml')).sst).si as unknown[]|undefined).map(itemText)
    : [];
  const parsed=xml.parse(readText(zip,sheets[0]));
  const sheet=field(field(parsed.worksheet).sheetData);
  const data=asArray(sheet.row as unknown[]|undefined);
  if(data.length>3001)throw new Error('O arquivo excede o limite de 3.000 MPs.');
  const rows:MpCell[][]=[];
  let totalCells=0;
  for(const entry of data){
    const row=field(entry);
    const rowNum=Number(row['@_r']);
    const cols:MpCell[]=[];
    for(const rawCell of asArray(row.c as unknown[]|undefined)){
      totalCells++;
      if(totalCells>120000)throw new Error('Planilha com células demais.');
      const cell=field(rawCell);
      const match=/^([A-Z]+)\d+$/i.exec(val(cell['@_r']));
      if(!match)continue;
      let col=0;
      for(const letter of match[1].toUpperCase()) col=col*26+letter.charCodeAt(0)-64;
      if(col<1||col>80)continue; // limites conhecidos do relatório
      const type=val(cell['@_t']);
      const raw=type==='inlineStr'?itemText(cell.is):val(cell.v);
      const value=type==='s'?sst[Number(raw)]??'':type==='b'?raw==='1':type==='n'||(!type&&raw!=='')?
        (Number.isFinite(Number(raw))?Number(raw):raw):raw;
      cols[col-1]=value;
    }
    if(Number.isSafeInteger(rowNum)&&rowNum>0&&rowNum<=3001)rows[rowNum-1]=cols;
  }
  return rows.map(r=>r??[]);
}
export function csvRows(content:string):MpCell[][]{
  const plain=content.replace(/^\uFEFF/,'');
  const firstLine=plain.slice(0,plain.indexOf('\n')<0?plain.length:plain.indexOf('\n'));
  const delimiter=(firstLine.match(/;/g)||[]).length>=(firstLine.match(/,/g)||[]).length?';':',';
  const rows:MpCell[][]=[];
  let row:string[]=[],v='',quoted=false;
  for(let i=0;i<plain.length;i++){
    const ch=plain[i];
    if(quoted){
      if(ch==='"'&&plain[i+1]==='"'){v+='"';i++;}
      else if(ch==='"')quoted=false;
      else v+=ch;
    } else if(ch==='"')quoted=true;
    else if(ch===delimiter){row.push(v);v='';}
    else if(ch==='\n'){row.push(v.replace(/\r$/,''));rows.push(row);row=[];v='';}
    else v+=ch;
    if(rows.length>3001)throw new Error('CSV acima do limite de 3.000 MPs.');
  }
  if(quoted)throw new Error('CSV com aspas não fechadas.');
  if(v||row.length){row.push(v.replace(/\r$/,''));rows.push(row);}
  return rows;
}
