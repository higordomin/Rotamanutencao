import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {evidenceUri,MAX_PHOTO_BYTES} from './evidence';
import type {PdfPicture} from './professionalPdf';

export type PdfPhotoSource={filename:string;mime_type:'image/jpeg'|'image/png';caption:string};
export const MAX_PDF_PHOTOS=24;
export const MAX_PDF_PHOTO_TOTAL_BYTES=16*1024*1024;

/**
 * Fotos vêm do diretório privado de evidências, com teto de uso de memória.
 * Nenhum upload e nenhuma alteração no banco de dados.
 */
export async function loadPdfPictures(sources:readonly PdfPhotoSource[]):Promise<PdfPicture[]> {
  if(sources.length>MAX_PDF_PHOTOS)
    throw new Error('O PDF permite até 24 fotos. Gere relatórios menores ou sem anexos.');
  let bytes=0;
  const pictures:PdfPicture[]=[];
  for(const photo of sources){
    if(!['image/jpeg','image/png'].includes(photo.mime_type))
      throw new Error('Formato de imagem não suportado no PDF.');
    const uri=evidenceUri(photo.filename);
    const info=await FileSystem.getInfoAsync(uri);
    if(!info.exists||info.isDirectory||typeof info.size!=='number'||info.size<=0||info.size>MAX_PHOTO_BYTES)
      throw new Error('Foto ausente ou maior que o limite individual. Gere sem fotos ou restaure a evidência.');
    bytes+=info.size;
    if(bytes>MAX_PDF_PHOTO_TOTAL_BYTES)
      throw new Error('As fotos excedem 16 MB. Selecione um período menor ou emita sem fotos.');
    pictures.push({mime_type:photo.mime_type,caption:photo.caption,
      base64:await FileSystem.readAsStringAsync(uri,{encoding:FileSystem.EncodingType.Base64})});
  }
  return pictures;
}
export async function printAndSharePdf(html:string,title:string):Promise<void> {
  if(!await Sharing.isAvailableAsync())
    throw new Error('Compartilhamento de arquivos indisponível no aparelho.');
  const file=await Print.printToFileAsync({html});
  await Sharing.shareAsync(file.uri,{mimeType:'application/pdf',dialogTitle:title});
}
