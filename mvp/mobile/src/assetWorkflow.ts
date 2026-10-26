import type {Asset, Execution} from './types';

function normalized(value:string):string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
}

/** Busca local tolerante a acentos, espaços e caixa, sem acessar rede. */
export function searchAssets<T extends Pick<Asset,'name'|'code'|'area'>>(assets:T[],term:string):T[] {
  const needle=normalized(term);
  if(!needle)return assets;
  return assets.filter(asset=>[asset.code,asset.name,asset.area].some(field=>normalized(field).includes(needle)));
}

/** Atalho de OS: só preseleciona o equipamento, sem gravar dados. */
export function preselectAsset<T extends {asset_id:string|null}>(draft:T,asset:Pick<Asset,'id'>):T {
  if(!asset.id.trim())throw new Error('Equipamento inválido.');
  return {...draft,asset_id:asset.id};
}

/**
 * Snapshot da TAG no momento da execução. Continua preservado no histórico
 * mesmo quando o cadastro muda de nome/setor ou o ativo é excluído.
 */
export function assetSnapshot(asset: Pick<Asset,'code'|'name'|'area'>): string {
  return [asset.code,asset.name,asset.area].filter(Boolean).join(' · ').slice(0,300);
}

/**
 * Migração conservadora de registros v2-v8: só atribui ID se o retrato
 * coincide EXATAMENTE com um único ativo atual. Duplicidade é ambígua.
 * Nunca associar apenas por prefixo de TAG ou equipamento da OS atual.
 */
export function buildLegacyAssetIndex(assets:ReadonlyArray<Pick<Asset,'id'|'code'|'name'|'area'>>): Map<string,string|null> {
  const result=new Map<string,string|null>();
  for(const asset of assets) {
    const label=assetSnapshot(asset);
    if(!label)continue;
    if(result.has(label)) result.set(label,null);
    else result.set(label,asset.id);
  }
  return result;
}

export function inferLegacyAssetId(snapshot:string, index:ReadonlyMap<string,string|null>):string|null {
  return index.get(snapshot)??null;
}

/** Identidade de execução futura é o ID estável; legado sem ID usa retrato exato. */
export function executionBelongsToAssetSnapshot(
  execution:Pick<Execution,'asset_label'> & Partial<Pick<Execution,'asset_id'>>,
  asset:Pick<Asset,'id'|'code'|'name'|'area'>,
  legacyIndex?:ReadonlyMap<string,string|null>,
):boolean {
  if(execution.asset_id!==null && execution.asset_id!==undefined)
    return execution.asset_id===asset.id;
  const snapshot=assetSnapshot(asset);
  if(snapshot.length===0 || execution.asset_label!==snapshot)return false;
  // Na visão por TAG, um retrato de dois ativos não pode ser atribuído a ambos.
  return legacyIndex === undefined || legacyIndex.get(snapshot) === asset.id;
}
