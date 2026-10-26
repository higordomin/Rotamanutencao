import type {RouteRunItem,RouteRunPhoto} from './routes';
import {assetSearchKey} from './assetCatalog.ts';
import {visibleRouteItems} from './quickRouteActions.ts';

export type ExecutionFilter='all'|'pending'|'attention';
/** Filtros combináveis, sem mudar a ordem salva no SQLite. */
export function filterExecutionItems<T extends Pick<RouteRunItem,'status'|'point_title'|'asset_label'>>(
  items:readonly T[],filter:ExecutionFilter,query:string,
):T[] {
  const words=assetSearchKey(query).split(' ').filter(Boolean);
  const filtered=visibleRouteItems(items,filter);
  return words.length===0?filtered:filtered.filter(item=>{
    const target=assetSearchKey([item.point_title,item.asset_label].join(' '));
    return words.every(word=>target.includes(word));
  });
}
export function pagedExecutionItems<T>(items:readonly T[],limit:number):T[]{
  const count=Number.isSafeInteger(limit)?Math.max(0,limit):0;
  return items.slice(0,count);
}
export function nextPendingItem<T extends Pick<RouteRunItem,'status'>>(items:readonly T[]):T|null {
  return items.find(item=>item.status==='pending')??null;
}
export function photosByRouteItem(photos:readonly RouteRunPhoto[]):Map<string,RouteRunPhoto[]> {
  const grouped=new Map<string,RouteRunPhoto[]>();
  for(const photo of photos) {
    const group=grouped.get(photo.item_id)??[];
    group.push(photo);
    grouped.set(photo.item_id,group);
  }
  return grouped;
}
