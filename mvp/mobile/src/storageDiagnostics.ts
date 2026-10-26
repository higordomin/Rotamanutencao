import * as FileSystem from 'expo-file-system/legacy';
import {getDatabase} from './db';
import {evidenceUri} from './evidence';

export type IntegrityReport={
  databaseOk:boolean;databaseDetails:string;
  foreignKeyErrors:number;
  archivedOrders:number;
  activeOrders:number;
  photoRecords:number;
  verifiedPhotos:number;
  missingPhotos:number;
  uncheckedPhotos:number;
};
/**
 * Auditoria de leitura somente, não faz correção automática nem apaga evidências.
 * Protege contra falso positivo: se alguma imagem não foi examinada, informa contagem.
 */
export async function inspectLocalStorage():Promise<IntegrityReport>{
  const db=await getDatabase();
  const quick=await db.getFirstAsync<{quick_check:string}>('PRAGMA quick_check');
  const foreign=await db.getAllAsync<{table:string;rowid:number;parent:string;fkid:number}>(
    'PRAGMA foreign_key_check');
  const orderStats=await db.getFirstAsync<{active:number;archived:number}>(`
    SELECT SUM(CASE WHEN archived_at IS NULL THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN archived_at IS NOT NULL THEN 1 ELSE 0 END) AS archived
    FROM work_orders`);
  const photoNames=await db.getAllAsync<{filename:string}>(`
    SELECT filename FROM execution_photos UNION ALL
    SELECT filename FROM route_run_photos`);
  const LIMIT=2000;
  let missing=0;
  let checked=0;
  for(const photo of photoNames.slice(0,LIMIT)){
    try {
      const info=await FileSystem.getInfoAsync(evidenceUri(photo.filename));
      if(!info.exists||info.isDirectory||!info.size)missing++;
    } catch {missing++;}
    checked++;
  }
  return {databaseOk:quick?.quick_check==='ok',
    databaseDetails:quick?.quick_check??'Verificação indisponível',
    foreignKeyErrors:foreign.length,
    archivedOrders:orderStats?.archived??0,
    activeOrders:orderStats?.active??0,
    photoRecords:photoNames.length,
    verifiedPhotos:checked,missingPhotos:missing,
    uncheckedPhotos:photoNames.length-checked};
}
