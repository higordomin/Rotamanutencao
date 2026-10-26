import {getDatabase} from './db';
import {localDate} from './logic';
import {shiftAgendaDate} from './operationalAgenda';

export type WeeklyProductivity={
  start:string;end:string;osCompleted:number;osPartial:number;routesFinished:number;
};
/** Apenas contagens de registros concluídos no SQLite. Não inventa tempo
 * de serviço, produtividade percentual ou execução de tarefas pendentes.
 */
export async function readWeeklyProductivity(today=localDate()):Promise<WeeklyProductivity>{
  const start=shiftAgendaDate(today,-6);
  const db=await getDatabase();
  const counts=await db.getFirstAsync<{completed:number;partial:number;routes:number}>(`
    SELECT
      (SELECT COUNT(*) FROM executions
        WHERE result='completed' AND date(executed_at,'localtime') BETWEEN ? AND ?) AS completed,
      (SELECT COUNT(*) FROM executions
        WHERE result='partial' AND date(executed_at,'localtime') BETWEEN ? AND ?) AS partial,
      (SELECT COUNT(*) FROM route_runs
        WHERE finished_at IS NOT NULL AND date(finished_at,'localtime') BETWEEN ? AND ?) AS routes
  `,start,today,start,today,start,today);
  if(!counts)throw new Error('Não foi possível consultar os apontamentos da semana.');
  return {start,end:today,osCompleted:counts.completed,
    osPartial:counts.partial,routesFinished:counts.routes};
}
