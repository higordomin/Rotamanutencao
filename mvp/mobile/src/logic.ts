/** Regras puras de calendário e classificação. Não dependem de serviços externos. */
export function localDate(value = new Date()): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function validDate(input: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return false;
  const [year, month, day] = input.split('-').map(Number);
  if (year < 1900 || year > 2100) return false;
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function addDays(date: string, days: number): string {
  if (!validDate(date) || !Number.isSafeInteger(days) || days < 0 || days > 36500)
    throw new Error('Data ou intervalo de recorrência inválido.');
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(year, month - 1, day, 12);
  next.setDate(next.getDate() + days);
  const result = localDate(next);
  if (!validDate(result)) throw new Error('Data futura fora do intervalo permitido.');
  return result;
}

export type RouteStatus = 'pending' | 'completed';
export type TaskState = 'blocked' | 'completed' | 'overdue' | 'today' | 'upcoming';
export function taskState(task: {status: RouteStatus; block_reason?: string | null; due_date: string}, today = localDate()): TaskState {
  if (task.status === 'completed') return 'completed';
  if (task.block_reason?.trim()) return 'blocked';
  if (task.due_date < today) return 'overdue';
  if (task.due_date === today) return 'today';
  return 'upcoming';
}

export function taskSummary<T extends {status: RouteStatus; block_reason?: string | null; due_date: string}>(tasks: T[], today = localDate()) {
  return tasks.reduce((counts, task) => {
    counts[taskState(task, today)] += 1;
    return counts;
  }, {blocked: 0, completed: 0, overdue: 0, today: 0, upcoming: 0});
}
