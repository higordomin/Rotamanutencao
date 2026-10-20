import {addDays, localDate, validDate} from './logic.ts';

export type CalendarPage = {year: number; month: number};

/** Calcula calendário com segunda-feira como primeiro dia, sem UTC e sem dependências externas. */
export function pageFromDate(date: string): CalendarPage {
  const safe = validDate(date) ? date : localDate();
  const [year, month] = safe.split('-').map(Number);
  return {year, month};
}

export function dateFromParts(year: number, month: number, day: number): string {
  const date = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (!validDate(date)) throw new Error('Dia fora do intervalo permitido.');
  return date;
}

export function shiftMonth(page: CalendarPage, delta: -1 | 1): CalendarPage | null {
  const absolute = page.year * 12 + page.month - 1 + delta;
  const year = Math.floor(absolute / 12);
  const month = absolute % 12 + 1;
  return year >= 1900 && year <= 2100 ? {year, month} : null;
}

/** 35 ou 42 células em meses de 5/6 semanas; inclui espaços vazios do início/fim. */
export function monthGrid(page: CalendarPage): Array<string | null> {
  const {year, month} = page;
  if (!Number.isInteger(year) || year < 1900 || year > 2100
    || !Number.isInteger(month) || month < 1 || month > 12)
    throw new Error('Mês fora do intervalo permitido.');
  const firstWeekDay = (new Date(year, month - 1, 1, 12).getDay() + 6) % 7;
  const totalDays = new Date(year, month, 0, 12).getDate();
  const count = Math.ceil((firstWeekDay + totalDays) / 7) * 7;
  return Array.from({length: count}, (_, index) => {
    const day = index - firstWeekDay + 1;
    return day >= 1 && day <= totalDays ? dateFromParts(year, month, day) : null;
  });
}

export function brazilianDate(date: string): string {
  if (!validDate(date)) return 'Selecionar data';
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

export function tomorrow(): string {
  return addDays(localDate(), 1);
}
