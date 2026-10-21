import {validateBackup} from './backupValidation.ts';

/** Verifica somente a estrutura do arquivo; não altera ou limpa dados locais. */
export function inspectBackup(data: unknown) {
  validateBackup(data);
  return {
    version: data.version,
    exportedAt: data.exported_at,
    assets: data.assets.length,
    orders: data.work_orders.length,
    archivedOrders: data.work_orders.filter(order=>!!order.archived_at).length,
    executions: data.executions.length,
    photos: data.photos.length,
    events: data.order_events?.length ?? 0,
    impediments: data.work_orders.filter(order => !!order.block_reason?.trim()).length,
    partials: data.work_orders.filter(order => !!order.partial_reason?.trim()).length,
    routes: data.routes?.length ?? 0,
    routePoints: data.route_points?.length ?? 0,
    routeRuns: data.route_runs?.length ?? 0,
    routePhotos: data.route_photos?.length ?? 0,
    scheduledRoutes: data.routes?.filter(r => r.recurrence_days>0).length ?? 0,
    routesWithAttention: data.routes?.filter(r => r.attention_count>0).length ?? 0,
  };
}
