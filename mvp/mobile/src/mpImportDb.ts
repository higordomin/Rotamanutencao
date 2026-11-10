import {getDatabase} from './db';
import {validDate} from './logic';
import type {ImportedMp} from './mpImport';

export type MpImportResult={
  created:number; duplicates:number; missingDates:number;
  rejected:number;
};
/**
 * Importação estritamente aditiva e atômica.
 * Nunca sobrescreve OS manual, OS arquivada, fotos, execução ou histórico.
 */
export async function importMpItems(items:ImportedMp[], rejected=0):Promise<MpImportResult>{
  if(!items.length||items.length>3000)throw new Error('Selecione de 1 a 3.000 MPs.');
  const db=await getDatabase();
  const result:MpImportResult={created:0,duplicates:0,missingDates:0,rejected};
  const now=new Date().toISOString();
  await db.withExclusiveTransactionAsync(async tx=>{
    for(const item of items){
      if(!/^MP[A-Z0-9_-]{1,35}$/.test(item.mp_code) || !item.title.trim() || item.title.length>300 ||
        !Number.isSafeInteger(item.recurrence_days)||item.recurrence_days<1||item.recurrence_days>36500 ||
        !Number.isSafeInteger(item.recurrence_months)||item.recurrence_months<0||item.recurrence_months>1200 ||
        item.asset_label.length>300 || item.last_os_number.length>30 ||
        (item.duration_minutes!==null&&(!Number.isSafeInteger(item.duration_minutes)||item.duration_minutes<0||item.duration_minutes>10080)))
        throw new Error('MP inválida encontrada. Importação cancelada integralmente.');
      const exists=await tx.getFirstAsync<{id:string}>(
        'SELECT id FROM work_orders WHERE mp_code=?',item.mp_code);
      if(exists){result.duplicates++;continue;}
      if(!item.due_date || !validDate(item.due_date)){result.missingDates++;continue;}
      const id='maximo-'+item.mp_code;
      const sql='INSERT INTO work_orders('+
        'id,title,description,category,priority,asset_id,recurrence_days,recurrence_months,'+
        'due_date,status,created_at,updated_at,mp_code,source_os_number,source_asset_label,planned_minutes'+
        ') VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
      await tx.runAsync(sql,
        id,item.title,'',item.category,'Média',null,item.recurrence_days,item.recurrence_months,
        item.due_date,'pending',now,now,item.mp_code,item.last_os_number,item.asset_label,item.duration_minutes);
      result.created++;
    }
  });
  return result;
}
