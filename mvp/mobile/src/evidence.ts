import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import type {PhotoDraft} from './types';

export const MAX_PHOTOS_PER_EXECUTION = 6;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function root(): string {
  if (!FileSystem.documentDirectory) throw new Error('Armazenamento local indisponível.');
  return `${FileSystem.documentDirectory}evidence/`;
}

export function evidenceUri(filename: string): string {
  if (!/^[a-zA-Z0-9_-]+\.(jpe?g|png)$/.test(filename))
    throw new Error('Nome de arquivo inválido.');
  return root() + filename;
}

export async function makeEvidenceDirectory(): Promise<void> {
  await FileSystem.makeDirectoryAsync(root(), {intermediates: true});
}

export function newFilename(mimeType: string): string {
  const extension = mimeType === 'image/png' ? 'png' : 'jpg';
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 13)}.${extension}`;
}

export async function persistPhoto(input: PhotoDraft): Promise<string> {
  const info = await FileSystem.getInfoAsync(input.uri);
  if (!info.exists || info.isDirectory || (info.size ?? 0) > MAX_PHOTO_BYTES)
    throw new Error('Foto não encontrada ou maior que 5 MB. Selecione outra foto.');
  if (input.mime_type !== 'image/jpeg' && input.mime_type !== 'image/png')
    throw new Error('Somente fotos JPEG ou PNG são aceitas.');
  await makeEvidenceDirectory();
  const filename = newFilename(input.mime_type);
  await FileSystem.copyAsync({from: input.uri, to: evidenceUri(filename)});
  return filename;
}

export async function deletePhotoFile(filename: string): Promise<void> {
  await FileSystem.deleteAsync(evidenceUri(filename), {idempotent: true});
}

export async function selectPhoto(fromCamera: boolean): Promise<PhotoDraft | null> {
  if (fromCamera) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('Autorize a câmera para fotografar o serviço.');
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'], allowsEditing: true, quality: 0.55,
  };
  const result = fromCamera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets.length) return null;
  const selected = result.assets[0];
  const mime = selected.mimeType || (selected.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
  if (mime !== 'image/jpeg' && mime !== 'image/png')
    throw new Error('Imagem não suportada. Selecione JPEG/PNG ou tire uma foto.');
  const info = await FileSystem.getInfoAsync(selected.uri);
  if (!info.exists || info.isDirectory || (info.size ?? 0) > MAX_PHOTO_BYTES)
    throw new Error('A imagem ultrapassa 5 MB. Escolha ou capture uma imagem menor.');
  return {uri: selected.uri, mime_type: mime};
}
