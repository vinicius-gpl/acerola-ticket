/**
 * O MOVIMENTO DO PERÍODO, DIA A DIA — o que entrou, o que saiu e o que foi feito.
 *
 * O banco só devolve os dias em que ALGUMA COISA aconteceu. Um gráfico de tempo montado
 * direto sobre isso mente por omissão: quatro chamados na segunda e quatro na sexta, sem os
 * dias do meio, viram uma linha reta que diz "o movimento foi constante a semana toda".
 *
 * Por isso a régua de dias é montada aqui, do primeiro ao último, e o dia sem nada vale
 * ZERO. Zero é um fato ("ninguém abriu chamado no domingo"); buraco não é.
 */

/** Uma contagem que o banco devolveu, para um dia em que houve movimento. */
export type DayCount = { day: string; total: number };

/** Um dia da régua, com tudo que aconteceu nele. */
export type DailyActivity = {
  /** O dia em `AAAA-MM-DD`, que é como o banco agrupa e como a régua compara. */
  day: string;
  opened: number;
  resolved: number;
  maintenances: number;
};

/** O teto de dias que a régua monta — o mesmo teto do período do painel. */
const MAX_DAYS = 366;

/**
 * A régua de dias do período, com as contagens encaixadas.
 *
 * `from` e `to` entram os dois na régua: "os últimos 7 dias" mostra hoje.
 */
export function buildDailyActivity(
  from: Date,
  to: Date,
  opened: readonly DayCount[],
  resolved: readonly DayCount[],
  maintenances: readonly DayCount[],
): DailyActivity[] {
  const openedByDay = indexByDay(opened);
  const resolvedByDay = indexByDay(resolved);
  const maintenancesByDay = indexByDay(maintenances);

  return daysBetween(from, to).map((day) => ({
    day,
    opened: openedByDay.get(day) ?? 0,
    resolved: resolvedByDay.get(day) ?? 0,
    maintenances: maintenancesByDay.get(day) ?? 0,
  }));
}

/** O dia de uma data em `AAAA-MM-DD`, no fuso de quem está lendo. */
export function dayKeyOf(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Todos os dias de `from` a `to`, inclusive os dois.
 *
 * Avança pelo NÚMERO DO DIA (`setDate`), e não somando 24 horas: no dia em que o horário de
 * verão entra ou sai, o dia tem 23 ou 25 horas, e somar 24 pularia ou repetiria uma data.
 */
function daysBetween(from: Date, to: Date): string[] {
  if (from > to) return [];

  const days: string[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const last = dayKeyOf(to);

  while (days.length < MAX_DAYS) {
    const key = dayKeyOf(cursor);
    days.push(key);

    if (key === last) break;

    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function indexByDay(counts: readonly DayCount[]): Map<string, number> {
  return new Map(counts.map((count) => [count.day, count.total]));
}
