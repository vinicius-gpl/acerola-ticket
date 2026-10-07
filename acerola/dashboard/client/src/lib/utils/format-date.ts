/**
 * Data para a TELA, sempre em pt-BR e no fuso de quem está olhando.
 *
 * Um lugar só: cada tela chamando `toLocaleString` do seu jeito é como a mesma data aparece
 * "14/09/2026" numa lista e "2026-09-14T12:00:00.000Z" em outra.
 *
 * Texto que não é data devolve traço, nunca "Invalid Date" — e nunca uma data inventada.
 */
const DATE_TIME = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const DATE_ONLY = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });

export function formatDateTime(iso: string | null | undefined): string {
  const date = parse(iso);

  return date ? DATE_TIME.format(date) : '—';
}

export function formatDate(iso: string | null | undefined): string {
  const date = parse(iso);

  return date ? DATE_ONLY.format(date) : '—';
}

/**
 * Um DIA sem hora (`2026-09-28`) → "28/09/2026".
 *
 * Não passa por `Date` de propósito: `new Date('2026-09-28')` é meia-noite em Londres, que
 * no Brasil ainda é dia 27 — e a data escrita num documento apareceria um dia antes na tela.
 */
export function formatDay(day: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day ?? '');
  if (!match) return '—';

  return `${match[3]}/${match[2]}/${match[1]}`;
}

/**
 * Hoje, como dia sem hora (`2026-10-05`), NO FUSO DE QUEM ESTÁ USANDO.
 *
 * Não usa `toISOString()`: ele devolve o dia de Londres, e às dez da noite no Brasil um
 * formulário abriria com a data de amanhã.
 */
export function todayAsDay(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${now.getFullYear()}-${month}-${day}`;
}

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;

  const date = new Date(iso);

  return Number.isNaN(date.getTime()) ? null : date;
}
