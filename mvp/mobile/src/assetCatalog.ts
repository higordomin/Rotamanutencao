import type {Asset} from './types';

/** Índice local para busca de TAGs sem acentos, caixa ou espaços extras. */
export function assetSearchKey(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim();
}

export function assetAreas(assets: ReadonlyArray<Pick<Asset,'area'>>): string[] {
  const unique=new Map<string,string>();
  for(const asset of assets){
    const area=asset.area.trim().replace(/\s+/g,' ');
    const key=assetSearchKey(area);
    if(key&&!unique.has(key))unique.set(key,area);
  }
  return [...unique.values()].sort((a,b)=>a.localeCompare(b,'pt-BR',{numeric:true,sensitivity:'base'}));
}

export function findCatalogAssets<T extends Pick<Asset,'id'|'code'|'name'|'area'>>(
  assets: ReadonlyArray<T>, term='', area='',
): T[] {
  const words=assetSearchKey(term).split(' ').filter(Boolean);
  const filter=assetSearchKey(area);
  return assets.filter(asset=>{
    if(filter&&assetSearchKey(asset.area)!==filter)return false;
    const haystack=assetSearchKey([asset.code,asset.name,asset.area].join(' '));
    return words.every(word=>haystack.includes(word));
  }).sort((a,b)=>{
    const first=a.code.trim(),second=b.code.trim();
    if(!first&&second)return 1;
    if(first&&!second)return -1;
    return first.localeCompare(second,'pt-BR',{numeric:true,sensitivity:'base'})
      ||a.name.localeCompare(b.name,'pt-BR',{numeric:true,sensitivity:'base'})
      ||a.area.localeCompare(b.area,'pt-BR',{numeric:true,sensitivity:'base'})
      ||a.id.localeCompare(b.id);
  });
}

/** Nunca inferir TAG por texto: apenas IDs persistidos podem ser confirmados. */
export function selectedCatalogAsset<T extends Pick<Asset,'id'>>(assets:ReadonlyArray<T>,id:string|null): T|null {
  return id ? assets.find(asset=>asset.id===id)??null:null;
}
