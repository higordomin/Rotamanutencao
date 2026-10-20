import {addDays} from './logic.ts';

/** Protege contra uma OS alterada/impedida enquanto o técnico preenche o formulário. */
export type OrderSnapshot = {
  id: string;
  updated_at: string;
  status: 'pending' | 'completed';
  block_reason: string | null;
  due_date: string;
  recurrence_days: number;
};

export function completionPlan(expected: OrderSnapshot, current: OrderSnapshot | null, today: string) {
  if (!current || current.id !== expected.id) throw new Error('A atividade não existe mais. Atualize a tela.');
  if (current.status !== 'pending') throw new Error('Esta atividade já foi concluída.');
  if (current.block_reason?.trim()) throw new Error('Libere o impedimento antes de executar.');
  if (current.updated_at !== expected.updated_at || current.due_date !== expected.due_date
    || current.recurrence_days !== expected.recurrence_days)
    throw new Error('A atividade mudou enquanto você preenchia o registro. Atualize e confira os dados.');
  return {nextDue: current.recurrence_days > 0 ? addDays(today, current.recurrence_days) : null};
}
