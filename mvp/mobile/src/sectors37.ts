import {assetSearchKey} from './assetCatalog.ts';

export const MAX_SECTOR_LENGTH=120;

/** Pesquisa rápida, sem acentos, caixa ou espaços extras: "sala de cortes" encontra "Sala de Cortes". */
export function sectorKey(value:string):string{
  return assetSearchKey(value);
}
export function cleanSector(value:string):string{
  return value.trim().replace(/\s+/g,' ');
}
export function knownSectors(
  orders:ReadonlyArray<{sector?:string|null}>,
  assets:ReadonlyArray<{area:string}>,
):string[]{
  const names=new Map<string,string>();
  for(const name of [...orders.map(o=>o.sector??''),...assets.map(a=>a.area)]){
    const display=cleanSector(name);
    const key=sectorKey(display);
    if(key&&!names.has(key))names.set(key,display);
  }
  return [...names.values()].sort((a,b)=>a.localeCompare(b,'pt-BR',{numeric:true,sensitivity:'base'}));
}
export function sectorSuggestions(names:readonly string[],query:string,limit=8):string[]{
  const key=sectorKey(query);
  return names.filter(s=>!key||sectorKey(s).includes(key)).slice(0,limit);
}
export function matchesSector(value:string,filter:string):boolean{
  const terms=sectorKey(filter).split(' ').filter(Boolean);
  const normalized=sectorKey(value);
  return terms.every(term=>normalized.includes(term));
}
export function orderSector<T extends {sector?:string|null;asset_area?:string|null}>(o:T):string{
  return cleanSector(o.sector??'')||cleanSector(o.asset_area??'');
}
