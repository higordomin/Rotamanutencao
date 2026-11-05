export type LocalCounts={assets:number;orders:number;routes:number;executions:number;archived:number};
/** Orientação somente quando a base operacional ainda está totalmente vazia.
 * Sem chave de cadastro, sem persistência de dados fictícios ou telemetria.
 */
export function shouldShowFirstUseGuide(c:LocalCounts):boolean{
  return Object.values(c).every(n=>Number.isSafeInteger(n)&&n===0);
}
export const FIRST_USE_STEPS=[
  {number:1,title:'Anote uma tarefa',description:'Digite o serviço, o setor e a data. Cadastrar o equipamento é opcional.'},
  {number:2,title:'Volte para registrar',description:'Quando fizer o serviço, abra a OS para concluir ou marcar pendência. Tudo fica no aparelho.'},
] as const;
