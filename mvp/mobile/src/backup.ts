import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {deletePhotoFile, evidenceUri, makeEvidenceDirectory, newFilename} from './evidence';
import {exportDatabaseRows, restoreDatabaseRows} from './db';
import {MAX_BACKUP_BYTES, MAX_RECORDS, validateBackup} from './backupValidation';
import {stagePhotos} from './restoreFiles';
import type {BackupData} from './types';

async function shareFile(uri: string, mimeType: string, title: string) {
  if (!await Sharing.isAvailableAsync()) throw new Error('Compartilhamento de arquivos indisponível.');
  await Sharing.shareAsync(uri, {mimeType, dialogTitle: title});
}

export async function exportBackup(): Promise<{assets: number; orders: number; executions: number; photos: number}> {
  const rows = await exportDatabaseRows();
  const photos: BackupData['photos'] = [];
  const routePhotos: NonNullable<BackupData['route_photos']> = [];
  if (rows.assets.length > MAX_RECORDS || rows.work_orders.length > MAX_RECORDS ||
      rows.executions.length > MAX_RECORDS || rows.photos.length > MAX_RECORDS ||
      (rows.order_events?.length ?? 0) > MAX_RECORDS ||
      (rows.routes?.length ?? 0) > MAX_RECORDS ||
      (rows.route_points?.length ?? 0) > MAX_RECORDS ||
      (rows.route_runs?.length ?? 0) > MAX_RECORDS ||
      (rows.route_run_items?.length ?? 0) > MAX_RECORDS ||
      rows.route_photos.length > MAX_RECORDS)
    throw new Error('A base excede o limite de backup desta versão.');
  for (const photo of rows.photos) {
    const info = await FileSystem.getInfoAsync(evidenceUri(photo.filename));
    if (!info.exists || info.isDirectory) throw new Error(`Foto ${photo.filename} não encontrada. Backup cancelado.`);
    photos.push({...photo, base64: await FileSystem.readAsStringAsync(evidenceUri(photo.filename), {
      encoding: FileSystem.EncodingType.Base64,
    })});
  }
  for (const photo of rows.route_photos) {
    const info=await FileSystem.getInfoAsync(evidenceUri(photo.filename));
    if(!info.exists||info.isDirectory)throw new Error('Foto do ponto '+photo.item_id+' está ausente. Backup cancelado.');
    routePhotos.push({...photo,base64:await FileSystem.readAsStringAsync(evidenceUri(photo.filename),{
      encoding:FileSystem.EncodingType.Base64,
    })});
  }
  const data: BackupData = {format: 'rotamanutencao-offline', version: 6,
    exported_at: new Date().toISOString(), assets: rows.assets,
    work_orders: rows.work_orders, executions: rows.executions, photos,
    order_events: rows.order_events,
    routes: rows.routes, route_points: rows.route_points,
    route_runs: rows.route_runs, route_run_items: rows.route_run_items,
    route_photos: routePhotos};
  validateBackup(data);
  const content = JSON.stringify(data);
  // Aproximação conservadora: UTF-8 pode ocupar mais bytes que JS length.
  if (content.length * 3 > MAX_BACKUP_BYTES) throw new Error('Backup grande demais para esta versão (limite conservador de 20 MB de texto).');
  if (!FileSystem.cacheDirectory) throw new Error('Cache local indisponível.');
  const uri = `${FileSystem.cacheDirectory}rotamanutencao_backup_${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(uri, content, {encoding: FileSystem.EncodingType.UTF8});
  await shareFile(uri, 'application/json', 'Salvar backup do RotaManutenção');
  return {assets: rows.assets.length, orders: rows.work_orders.length,
    executions: rows.executions.length, photos: rows.photos.length};
}

export async function pickBackupFile(): Promise<BackupData | null> {
  const result = await DocumentPicker.getDocumentAsync({type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true, multiple: false});
  if (result.canceled || !result.assets.length) return null;
  const file = result.assets[0];
  const info = await FileSystem.getInfoAsync(file.uri);
  if (!info.exists || info.isDirectory || (info.size ?? MAX_BACKUP_BYTES + 1) > MAX_BACKUP_BYTES)
    throw new Error('Arquivo indisponível ou acima de 60 MB.');
  const text = await FileSystem.readAsStringAsync(file.uri, {encoding: FileSystem.EncodingType.UTF8});
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error('JSON de backup corrompido.'); }
  validateBackup(data);
  return data;
}

export async function restoreBackup(data: BackupData): Promise<void> {
  validateBackup(data);
  await makeEvidenceDirectory();
  const oldRows = await exportDatabaseRows();
  const oldPhotos = [...oldRows.photos,...oldRows.route_photos];
  const staged = [
    ...data.photos.map(photo=>({...photo,id:'os:'+photo.id})),
    ...(data.route_photos??[]).map(photo=>({...photo,id:'route:'+photo.id})),
  ];
  const {filenames, created} = await stagePhotos(
    staged, newFilename,
    (filename, base64) => FileSystem.writeAsStringAsync(evidenceUri(filename), base64, {
      encoding: FileSystem.EncodingType.Base64,
    }),
    deletePhotoFile,
  );
  try {
    await restoreDatabaseRows(data, filenames);
  } catch (error) {
    await Promise.allSettled(created.map(deletePhotoFile));
    throw error;
  }
  // Nunca apagamos as fotos antigas antes da transação bem-sucedida.
  await Promise.allSettled(oldPhotos.map(p => deletePhotoFile(p.filename)));
}
