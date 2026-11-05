/** IDs estáveis vinculados a uma única OS. Preserve asset_id legado como TAG principal. */
export const MAX_ASSETS_PER_ORDER=30;

/** Backups e OS anteriores ao 0.38 possuem somente asset_id. */
export function linkedAssetIds(order:{asset_id:string|null;asset_ids_json?:string|null}):string[]{
  const primary=order.asset_id;
  if(!order.asset_ids_json)return primary?[primary]:[];
  try{
    const raw:unknown=JSON.parse(order.asset_ids_json);
    if(!Array.isArray(raw))return primary?[primary]:[];
    const ids=raw.filter((v):v is string=>typeof v==='string'&&!!v.trim());
    const unique=[...new Set(ids)];
    if(unique.length>MAX_ASSETS_PER_ORDER)return primary?[primary]:[];
    return unique.length?unique:(primary?[primary]:[]);
  }catch{
    return primary?[primary]:[];
  }
}

/** Normaliza seleção do usuário e exige apenas IDs conhecidos, não TAGs digitadas. */
export function normalizeAssetIds(selected:readonly string[]|undefined|null,primary:string|null):string[]{
  const ids=selected??(primary?[primary]:[]);
  if(ids.length>MAX_ASSETS_PER_ORDER)throw new Error('Uma OS pode conter até 30 equipamentos.');
  if(ids.some(id=>typeof id!=='string'||!id.trim()||id.length>100))
    throw new Error('Selecione equipamentos cadastrados.');
  return [...new Set(ids)];
}

export function orderContainsAsset(
  order:{asset_id:string|null;asset_ids_json?:string|null},assetId:string,
):boolean{
  return linkedAssetIds(order).includes(assetId);
}
