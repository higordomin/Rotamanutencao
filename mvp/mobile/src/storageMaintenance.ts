import {getDatabase} from './db';
import {sameRecordCounts,totalRecords,type RecordCounts} from './maintenancePlan';

async function counts():Promise<RecordCounts> {
  const db=await getDatabase();
  const row=await db.getFirstAsync<RecordCounts>(`
    SELECT
      (SELECT COUNT(*) FROM assets) AS assets,
      (SELECT COUNT(*) FROM work_orders) AS workOrders,
      (SELECT COUNT(*) FROM executions) AS executions,
      (SELECT COUNT(*) FROM routes) AS routes,
      (SELECT COUNT(*) FROM route_runs) AS routeRuns,
      ((SELECT COUNT(*) FROM execution_photos)+
       (SELECT COUNT(*) FROM route_run_photos)) AS photos
  `);
  if(!row)throw new Error('Não foi possível verificar o conteúdo do banco.');
  return row;
}

/**
 * Manutenção exclusivamente interna do SQLite. Não remove registros, backups,
 * fotos ou versões anteriores: PRAGMA optimize atualiza estatísticas do banco.
 * Execução manual; nunca ocorre silenciosamente durante o serviço.
 */
export async function optimizeLocalDatabase():Promise<{records:number;photos:number}> {
  const db=await getDatabase();
  const integrity=await db.getFirstAsync<{quick_check:string}>('PRAGMA quick_check');
  if(integrity?.quick_check!=='ok')
    throw new Error('Integridade do banco não confirmada. Faça backup e use o diagnóstico.');
  const foreign=await db.getAllAsync<{table:string}>('PRAGMA foreign_key_check');
  if(foreign.length)
    throw new Error('Foram encontradas referências inconsistentes. A otimização foi cancelada.');
  const before=await counts();
  await db.execAsync('PRAGMA optimize;');
  const after=await counts();
  if(!sameRecordCounts(before,after))
    throw new Error('Houve mudança simultânea nos registros; verifique novamente a integridade do banco.');
  return {records:totalRecords(after),photos:after.photos};
}
