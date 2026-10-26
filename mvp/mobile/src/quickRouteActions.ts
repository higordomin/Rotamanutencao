import type {RouteRunItem} from './routes';

/**
 * Atalho EXPLÍCITO acionado somente após a manutenção física ter sido realizada.
 * Usa somente o resultado do ponto; não inventa materiais, quantidades,
 * observações ou evidências fotográficas.
 */
export function quickDoneDraft(item:Pick<RouteRunItem,
  'id'|'status'|'recorded_at'>) {
  if(!item.id.trim())throw new Error('Ponto inválido.');
  if(item.status!=='pending'||item.recorded_at!==null)
    throw new Error('O registro rápido é permitido apenas em pontos ainda pendentes.');
  return {
    id:item.id,
    status:'done' as const,
    notes:'',
  };
}

export function visibleRouteItems<T extends Pick<RouteRunItem,'status'>>(
  items:readonly T[],
  filter:'all'|'pending'|'attention',
):T[]{
  if(filter==='all')return [...items];
  if(filter==='pending')return items.filter(i=>i.status==='pending');
  return items.filter(i=>i.status==='anomaly'||i.status==='skipped');
}

/** Alertas/ações são calculados sem alterar as linhas originais. */
export function routeProgress(items:readonly Pick<RouteRunItem,'status'>[]){
  const pending=items.filter(i=>i.status==='pending').length;
  const attention=items.filter(i=>i.status==='anomaly'||i.status==='skipped').length;
  return {total:items.length,pending,attention,recorded:items.length-pending};
}
