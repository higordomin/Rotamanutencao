import type {OrderDraft, WorkOrder} from './types';
import {validDate} from './logic.ts';

/**
 * Cópia somente do planejamento de uma OS: não transfere ID, execução,
 * histórico, fotos, impedimentos, situação parcial ou data antiga.
 */
export function duplicateOrderDraft(order: WorkOrder, newDueDate: string): OrderDraft {
  if (order.archived_at !== null) throw new Error('Reative a OS arquivada antes de duplicar.');
  if (!validDate(newDueDate)) throw new Error('A nova data programada é inválida.');
  return {
    title: order.title,
    description: order.description,
    category: order.category,
    priority: order.priority,
    asset_id: order.asset_id,
    recurrence_days: order.recurrence_days,
    due_date: newDueDate,
  };
}

/** Tarefas prioritárias que ainda precisam de atuação, mesmo se impedidas. */
export function needsPriorityAttention(order: Pick<WorkOrder, 'status' | 'priority' | 'archived_at'>): boolean {
  return order.archived_at === null && order.status === 'pending' && order.priority === 'Alta';
}
