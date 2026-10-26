/** Regras de manutenção não destrutiva do acervo individual. */
export type RecordCounts = {
  assets:number;
  workOrders:number;
  executions:number;
  routes:number;
  routeRuns:number;
  photos:number;
};

/** A manutenção nunca deve modificar os registros do usuário. */
export function sameRecordCounts(before:RecordCounts,after:RecordCounts):boolean {
  return (Object.keys(before) as Array<keyof RecordCounts>).every(key=>
    Number.isSafeInteger(before[key])&&Number.isSafeInteger(after[key])&&
    before[key]===after[key]);
}
export function totalRecords(counts:RecordCounts):number {
  return Object.values(counts).reduce((sum,count)=>sum+count,0);
}
