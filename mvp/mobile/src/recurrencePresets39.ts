/**
 * Presets de manutenção existentes: preservam recurrence_days no SQLite e
 * notificações atuais. "Mensal" representa 30 dias corridos, não mês calendário.
 */
export const RECURRENCE_PRESETS = [
  {key:'once',label:'Uma vez',days:0},
  {key:'daily',label:'Diária',days:1},
  {key:'weekly',label:'Semanal',days:7},
  {key:'monthly',label:'Mensal',days:30},
  {key:'bimonthly',label:'Bimestral',days:60},
  {key:'quarterly',label:'Trimestral',days:90},
  {key:'fourmonthly',label:'Quadrimestral',days:120},
  {key:'semiannual',label:'Semestral',days:180},
  {key:'annual',label:'Anual',days:365},
] as const;

export const MAX_RECURRENCE_DAYS=36500;

export function validRecurrenceInput(input:string):boolean{
  if(!/^\d+$/.test(input))return false;
  const value=Number(input);
  return Number.isSafeInteger(value)&&value>=0&&value<=MAX_RECURRENCE_DAYS;
}

export function recurrencePreset(days:number){
  return RECURRENCE_PRESETS.find(x=>x.days===days)??null;
}

export function recurrenceSummary(value:string):string{
  if(!validRecurrenceInput(value))return 'Escolher repetição';
  const days=Number(value);
  if(days===0)return 'Uma vez (sem repetição)';
  const match=recurrencePreset(days);
  return match?`${match.label} · a cada ${days} ${days===1?'dia':'dias'}`
    :`Personalizado · a cada ${days} dias`;
}
