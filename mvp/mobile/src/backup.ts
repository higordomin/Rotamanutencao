import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {deletePhotoFile, evidenceUri, makeEvidenceDirectory, newFilename} from './evidence';
import {exportDatabaseRows, restoreDatabaseRows, validDate} from './db';
import type {BackupData} from './types';

// JSON com fotos incorporadas: simples e portável, mas limitado em tamanho.
const MAX_BACKUP_BYTES = 60 * 1024 * 1024;
const MAX_RECORDS = 20000;
const ALLOWED_CATEGORIES = new Set(['Lubrificação', 'Mecânica', 'Elétrica', 'Inspeção']);
const ALLOWED_PRIORITIES = new Set(['Baixa', 'Média', 'Alta']);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, max = 10000): v is string => typeof v === 'string' && v.length <= max;
const ident = (v: unknown): v is string => str(v, 100) && v.length > 0;
const iso = (v: unknown): v is string => str(v, 50) && !Number.isNaN(Date.parse(v));

export function validateBackup(data: unknown): asserts data is BackupData {
  if (!isObj(data) || data.format !== 'rotamanutencao-offline' || data.version !== 2)
    throw new Error('Arquivo incompatível. É necessário um backup RotaManutenção v2.');
  if (!Array.isArray(data.assets) || data.assets.length > MAX_RECORDS) throw new Error('Equipamentos inválidos.');
  if (!Array.isArray(data.work_orders) || data.work_orders.length > MAX_RECORDS) throw new Error('Atividades inválidas.');
  if (!Array.isArray(data.executions) || data.executions.length > MAX_RECORDS) throw new Error('Execuções inválidas.');
  if (!Array.isArray(data.photos) || data.photos.length > MAX_RECORDS) throw new Error('Fotos inválidas.');
  if (!iso(data.exported_at)) throw new Error('Data do backup inválida.');
  const ids = (items: unknown[], name: string) => {
    const seen = new Set<string>();
    for (const item of items) {
      if (!isObj(item) || !ident(item.id) || seen.has(item.id))
        throw new Error(`Identificador inválido ou repetido: ${name}.`);
      seen.add(item.id);
    }
    return seen;
  };
  const aIds = ids(data.assets, 'equipamentos');
  const oIds = ids(data.work_orders, 'atividades');
  const eIds = ids(data.executions, 'execuções');
  ids(data.photos, 'fotos');
  for (const a of data.assets) {
    if (!str(a.name, 300) || !a.name.trim() || !str(a.code, 200) || !str(a.area, 200) || !iso(a.created_at))
      throw new Error('Equipamento com campos inválidos.');
  }
  for (const o of data.work_orders) {
    if (!str(o.title, 300) || !o.title.trim() || !str(o.description, 10000)
      || !ALLOWED_CATEGORIES.has(o.category) || !ALLOWED_PRIORITIES.has(o.priority)
      || (o.asset_id !== null && (!ident(o.asset_id) || !aIds.has(o.asset_id)))
      || !Number.isSafeInteger(o.recurrence_days) || o.recurrence_days < 0
      || !validDate(o.due_date) || !['pending', 'completed'].includes(o.status)
      || !iso(o.created_at) || !iso(o.updated_at))
      throw new Error('Atividade com dados ou vínculos inválidos.');
  }
  for (const e of data.executions) {
    if (!ident(e.order_id) || !oIds.has(e.order_id) || !str(e.order_title, 300)
      || !str(e.notes, 10000) || !iso(e.executed_at) || !validDate(e.previous_due_date)
      || (e.next_due_date !== null && !validDate(e.next_due_date))
      || !str(e.asset_label, 300) || !str(e.category, 100))
      throw new Error('Execução com dados ou vínculos inválidos.');
  }
  const imagesPerExecution = new Map<string, number>();
  for (const p of data.photos) {
    if (!ident(p.execution_id) || !eIds.has(p.execution_id) || !str(p.filename, 120)
      || !['image/jpeg', 'image/png'].includes(p.mime_type) || !iso(p.created_at)
      || !str(p.base64, 7_500_000) || p.base64.length < 10
      || p.base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(p.base64)
      || (p.mime_type === 'image/jpeg' && !p.base64.startsWith('/9j/'))
      || (p.mime_type === 'image/png' && !p.base64.startsWith('iVBORw0KGgo')))
      throw new Error('Foto inválida no arquivo de backup.');
    const count = (imagesPerExecution.get(p.execution_id) || 0) + 1;
    if (count > 6) throw new Error('O backup contém mais de 6 fotos por execução.');
    imagesPerExecution.set(p.execution_id, count);
  }
}

async function shareFile(uri: string, mimeType: string, title: string) {
  if (!await Sharing.isAvailableAsync()) throw new Error('Compartilhamento de arquivos indisponível.');
  await Sharing.shareAsync(uri, {mimeType, dialogTitle: title});
}

export async function exportBackup(): Promise<{assets: number; orders: number; executions: number; photos: number}> {
  const rows = await exportDatabaseRows();
  const photos: BackupData['photos'] = [];
  if (rows.assets.length > MAX_RECORDS || rows.work_orders.length > MAX_RECORDS ||
      rows.executions.length > MAX_RECORDS || rows.photos.length > MAX_RECORDS)
    throw new Error('A base excede o limite de backup desta versão.');
  for (const photo of rows.photos) {
    const info = await FileSystem.getInfoAsync(evidenceUri(photo.filename));
    if (!info.exists || info.isDirectory) throw new Error(`Foto ${photo.filename} não encontrada. Backup cancelado.`);
    photos.push({...photo, base64: await FileSystem.readAsStringAsync(evidenceUri(photo.filename), {
      encoding: FileSystem.EncodingType.Base64,
    })});
  }
  const data: BackupData = {format: 'rotamanutencao-offline', version: 2,
    exported_at: new Date().toISOString(), assets: rows.assets,
    work_orders: rows.work_orders, executions: rows.executions, photos};
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
  const oldPhotos = (await exportDatabaseRows()).photos;
  const newFilenames = new Map<string, string>();
  const createdFiles: string[] = [];
  try {
    for (const photo of data.photos) {
      const filename = newFilename(photo.mime_type);
      await FileSystem.writeAsStringAsync(evidenceUri(filename), photo.base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      newFilenames.set(photo.id, filename);
      createdFiles.push(filename);
    }
    await restoreDatabaseRows(data, newFilenames);
  } catch (error) {
    await Promise.allSettled(createdFiles.map(deletePhotoFile));
    throw error;
  }
  // Nunca apagamos as fotos antigas antes da transação bem-sucedida.
  await Promise.allSettled(oldPhotos.map(p => deletePhotoFile(p.filename)));
}
