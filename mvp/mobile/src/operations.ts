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

/**
 * Um serviço parcial deve ser documentado sem encerrar a OS nem reagendar
 * a próxima manutenção. O texto obrigatório explica a pendência.
 */
export function executionDecision(result: 'completed' | 'partial', notes: string, nextDue: string | null) {
  if (result !== 'completed' && result !== 'partial') throw new Error('Resultado de execução inválido.');
  if (notes.length > 10000) throw new Error('Observação grande demais. Resuma o registro.');
  const clean = notes.trim();
  if (result === 'partial' && (clean.length < 10 || clean.length > 1000))
    throw new Error('Descreva o que ficou pendente em 10 a 1000 caracteres.');
  return {
    orderStatus: result === 'partial' || nextDue ? 'pending' as const : 'completed' as const,
    nextDue: result === 'partial' ? null : nextDue,
    partialReason: result === 'partial' ? clean : '',
    notes: clean,
  };
}
