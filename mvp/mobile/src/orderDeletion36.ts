/** Regras puras para exclusão segura de OS no aparelho. */
export type OrderDeletionFacts={
  status:'pending'|'completed';
  block_reason:string|null;
  blocked_at:string|null;
  partial_reason:string|null;
  partial_at:string|null;
  executions:number;
  events:number;
  corrective_links:number;
};

/**
 * Exclusão definitiva serve para uma OS cadastrada por engano e ainda sem histórico.
 * Ao contrário de arquivar, DELETE pode disparar CASCADE no banco.
 * Com qualquer vínculo histórico é obrigatório arquivar, não apagar evidências.
 */
export function orderDeletionBlockReason(facts:OrderDeletionFacts):string|null{
  if(facts.executions>0)
    return 'Esta OS já possui execuções e pode conter fotos. Para preservar o histórico, use Arquivar.';
  if(facts.corrective_links>0)
    return 'Esta OS está vinculada a uma anomalia de rota. O vínculo deve ser preservado; use Arquivar.';
  if(facts.events>0||!!facts.block_reason?.trim()||!!facts.blocked_at||
    !!facts.partial_reason?.trim()||!!facts.partial_at)
    return 'Esta OS possui registros de impedimento, liberação ou execução parcial. Para preservar esses registros, use Arquivar.';
  if(facts.status!=='pending')
    return 'Esta OS já foi concluída. Para preservar a rastreabilidade, use Arquivar.';
  return null;
}
