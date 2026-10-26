export type LocalCounts={assets:number;orders:number;routes:number;executions:number;archived:number};
/** Orientação somente quando a base operacional ainda está totalmente vazia.
 * Sem chave de cadastro, sem persistência de dados fictícios ou telemetria.
 */
export function shouldShowFirstUseGuide(c:LocalCounts):boolean{
  return Object.values(c).every(n=>Number.isSafeInteger(n)&&n===0);
}
export const FIRST_USE_STEPS=[
  {number:1,title:'Identifique o equipamento',description:'Cadastre TAG, nome e setor para localizar serviços. É opcional.'},
  {number:2,title:'Crie uma OS ou rota',description:'Escolha o serviço e programe a data ou frequência.'},
  {number:3,title:'Registre o resultado',description:'Conclua, aponte uma anomalia ou informe por que não foi executado.'},
  {number:4,title:'Consulte o histórico',description:'Registros e fotos ficam salvos somente neste aparelho.'},
] as const;
