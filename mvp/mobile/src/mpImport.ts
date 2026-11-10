/**
 * Importação de planos preventivos exportados pelo Maximo.
 * Nenhum dado é enviado pela rede. A leitura preserva apenas colunas úteis.
 */
export type MpCell = string | number | boolean | null | undefined;
export type ImportedMp = {
  mp_code: string;
  title: string;
  asset_label: string;
  source_position: string; // código da posição, NÃO inventar o nome do setor
  last_os_number: string;   // referência histórica, NÃO confundir com OS atual
  duration_minutes: number | null;
  recurrence_days: number;
  recurrence_months: number;
  due_date: string | null;
  category: 'Lubrificação' | 'Mecânica' | 'Elétrica' | 'Inspeção' | 'Segurança';
  warning: string | null;
};
export type MpPreview = {items: ImportedMp[]; rejected: string[]};

const MAX_ROWS = 3000;
const text = (value: MpCell): string =>
  value === null || value === undefined ? '' : String(value).trim();
const normalize = (value: MpCell): string => text(value).normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

function parseDate(value: MpCell): string | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 20000 && value <= 73050) {
    const date = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    return date.toISOString().slice(0, 10);
  }
  const s = text(value);
  if (/^\d{5}$/.test(s)) return parseDate(Number(s));
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const formatted = br ? [br[3],br[2].padStart(2,'0'),br[1].padStart(2,'0')].join('-')
    : iso ? s : null;
  if (!formatted) return null;
  const [y,m,d]=formatted.split('-').map(Number);
  const check=new Date(Date.UTC(y,m-1,d));
  return check.getUTCFullYear()===y && check.getUTCMonth()===m-1 && check.getUTCDate()===d
    ? formatted : null;
}

function monthsFromTitle(title: string): number {
  const s = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (/\bTRIENAL\b/.test(s)) return 36;
  if (/\bBIENAL\b/.test(s)) return 24;
  if (/\bANUAL\b/.test(s)) return 12;
  if (/\bSEMESTRAL\b/.test(s)) return 6;
  if (/\bQUADRIMESTRAL\b/.test(s)) return 4;
  if (/\bTRIMESTRAL\b/.test(s)) return 3;
  if (/\bBIMESTRAL\b/.test(s)) return 2;
  if (/\bMENSAL\b/.test(s)) return 1;
  return 0;
}
function categoryFromTitle(title: string): ImportedMp['category'] {
  const s = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (/ELETRIC/.test(s)) return 'Elétrica';
  if (/MECANIC/.test(s)) return 'Mecânica';
  if (/SEGURAN/.test(s)) return 'Segurança';
  if (/INSPEC|^IP\b/.test(s)) return 'Inspeção';
  return 'Lubrificação';
}
function durationInMinutes(value: MpCell): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 24)
    return Math.round(value * 60); // Excel pode fornecer fração de hora
  const match = /^(\d{1,3}):([0-5]\d)$/.exec(text(value));
  if (!match) return null;
  const result=Number(match[1])*60+Number(match[2]);
  return result<=10080 ? result : null;
}

export function parseMpRows(rows: MpCell[][]): MpPreview {
  if (!Array.isArray(rows) || rows.length < 2 || rows.length > MAX_ROWS+1)
    throw new Error('A planilha deve conter cabeçalho e até 3.000 MPs.');
  const header=rows[0].map(normalize);
  const column=(...names:string[])=>header.findIndex(v=>names.includes(v));
  const ix={
    mp:column('MP'), title:column('DESCRICAO'), asset:column('DESCRICAOATIVO'),
    position:column('POSICAO'), lastOs:column('ULTIMAOSCRIADA'),
    duration:column('DURACAO'), frequency:column('FREQUENCIA'),
    frequencyUnit:column('UNIDADESDEFREQUENCIA'),
    reprogrammed:column('DATAREPROGRAMADA'), expected:column('DATAPREVISTA'),
  };
  if (ix.mp<0 || ix.title<0 || ix.frequency<0 || (ix.expected<0 && ix.reprogrammed<0))
    throw new Error('Colunas obrigatórias não encontradas: MP, Descrição, Freqüência e Data Prevista/Reprogramada.');
  const seen=new Set<string>();
  const items: ImportedMp[]=[];
  const rejected: string[]=[];
  for (let i=1;i<rows.length;i++){
    const r=rows[i];
    if (!r || r.every(v=>!text(v))) continue;
    const get=(index:number):MpCell=>index<0?null:r[index];
    const code=text(get(ix.mp));
    const title=text(get(ix.title)).replace(/\s+/g,' ');
    if (!/^MP[A-Z0-9_-]{1,35}$/i.test(code) || !title || title.length>300){
      rejected.push('Linha '+(i+1)+': código de MP ou descrição inválido.');
      continue;
    }
    if (seen.has(code.toUpperCase())){
      rejected.push('Linha '+(i+1)+': MP '+code+' repetida no arquivo.');
      continue;
    }
    seen.add(code.toUpperCase());
    const rawFrequency=Number(get(ix.frequency));
    const unit=normalize(get(ix.frequencyUnit));
    if (!Number.isSafeInteger(rawFrequency)||rawFrequency<1||rawFrequency>36500||
        (unit && unit!=='DAYS' && unit!=='DIAS')){
      rejected.push('Linha '+(i+1)+': frequência da MP '+code+' inválida ou unidade não suportada.');
      continue;
    }
    const titleMonths=monthsFromTitle(title);
    const expectedDays={1:30,2:60,3:90,4:120,6:180,12:365,24:730,36:1095} as Record<number,number>;
    // Se o título divergir da frequência do Maximo, respeitar a coluna e alertar.
    const recurrenceMonths=titleMonths && Math.abs(rawFrequency-expectedDays[titleMonths])<=3 ? titleMonths : 0;
    const due=parseDate(get(ix.reprogrammed))??parseDate(get(ix.expected));
    const asset=text(get(ix.asset));
    const lastOs=text(get(ix.lastOs));
    const duration=durationInMinutes(get(ix.duration));
    const warnings=[
      !due?'Sem data prevista válida — precisa preencher antes de importar.':null,
      titleMonths&&!recurrenceMonths?'Título e frequência divergentes — manter dias da MP.':null,
    ].filter(Boolean);
    items.push({
      mp_code:code.toUpperCase(), title,
      asset_label:asset==='39'?'':asset.slice(0,300),
      source_position:text(get(ix.position))==='39'?'':text(get(ix.position)).slice(0,100),
      last_os_number:/^\d{5,20}$/.test(lastOs)?lastOs:'',
      duration_minutes:duration,
      recurrence_days:rawFrequency,recurrence_months:recurrenceMonths,
      due_date:due,category:categoryFromTitle(title),
      warning:warnings.length?warnings.join(' '):null,
    });
  }
  if (!items.length) throw new Error('Nenhuma MP válida identificada no arquivo.');
  return {items,rejected};
}
