import type {RouteRunItem} from './routes';
import {gramAmount} from './routeRules.ts';

/**
 * Atalho EXPLÍCITO acionado somente após a manutenção física ter sido realizada.
 * Usa o planejamento já copiado para esta execução; nunca marca outro ponto,
 * nem inventa medições, observações ou evidências fotográficas.
 */
export function quickDoneDraft(item:Pick<RouteRunItem,
  'id'|'status'|'recorded_at'|'lubricant'|'quantity_grams'>) {
  if(!item.id.trim())throw new Error('Ponto inválido.');
  if(item.status!=='pending'||item.recorded_at!==null)
    throw new Error('O registro rápido é permitido apenas em pontos ainda pendentes.');
  const grams=gramAmount(item.quantity_grams);
  if(!Number.isFinite(grams))throw new Error('Quantidade prevista inválida.');
  if(item.lubricant.length>200)throw new Error('Lubrificante previsto excede o limite.');
  return {
    id:item.id,
    status:'done' as const,
    notes:'',
    lubricant:item.lubricant,
    quantity:String(grams),
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
