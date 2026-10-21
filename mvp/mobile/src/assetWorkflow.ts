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
 * Não associa registros só porque as TAGs têm prefixos parecidos.
 * Antes da versão com vínculo histórico permanente, usa o retrato exato
 * salvo na execução (código, nome e área; limite legado de 300 caracteres).
 * Uma edição posterior do cadastro pode fazer um registro ficar visível
 * apenas no histórico geral; jamais reescrevemos o histórico para ajustá-lo.
 */
export function executionBelongsToAssetSnapshot(
  execution:Pick<Execution,'asset_label'>,
  asset:Pick<Asset,'code'|'name'|'area'>,
):boolean {
  const snapshot=[asset.code,asset.name,asset.area].filter(Boolean).join(' · ').slice(0,300);
  return snapshot.length>0 && execution.asset_label===snapshot;
}
