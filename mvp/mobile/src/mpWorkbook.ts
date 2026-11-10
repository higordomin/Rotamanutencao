import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {parseMpRows, type MpPreview} from './mpImport';
import {MAX_FILE_SIZE,base64Bytes,xlsxRows,csvRows} from './mpWorkbookCodec';

export async function pickMpFile():Promise<MpPreview|null>{
  const choice=await DocumentPicker.getDocumentAsync({
    type:['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv','text/plain','*/*'],
    copyToCacheDirectory:true,multiple:false,
  });
  if(choice.canceled||!choice.assets.length)return null;
  const file=choice.assets[0];
  const info=await FileSystem.getInfoAsync(file.uri);
  if(!info.exists||info.isDirectory||(info.size??MAX_FILE_SIZE+1)>MAX_FILE_SIZE)
    throw new Error('Arquivo não encontrado ou acima de 8 MB.');
  const name=file.name.toLowerCase();
  if(name.endsWith('.xlsx')){
    const b64=await FileSystem.readAsStringAsync(file.uri,{encoding:FileSystem.EncodingType.Base64});
    return parseMpRows(xlsxRows(base64Bytes(b64)));
  }
  if(name.endsWith('.csv')){
    const content=await FileSystem.readAsStringAsync(file.uri,{encoding:FileSystem.EncodingType.UTF8});
    return parseMpRows(csvRows(content));
  }
  throw new Error('Selecione uma planilha .xlsx ou .csv exportada do Maximo.');
}
