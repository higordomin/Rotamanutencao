/** Regras de ação rápida independentes da interface visual.
 * Nunca aceita conclusão instantânea se há notas/fotos ainda não salvas.
 */
export function mayQuickCompletePoint(
  status:'pending'|'done'|'anomaly'|'skipped',
  dirty:boolean,disabled:boolean,
):boolean{
  return status==='pending'&&!dirty&&!disabled;
}
export function needsReasonForPoint(status:'pending'|'done'|'anomaly'|'skipped'):boolean{
  return status==='anomaly'||status==='skipped';
}
