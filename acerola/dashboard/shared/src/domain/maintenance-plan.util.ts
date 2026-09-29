import { monthsSince, preventiveStatusOf } from './maintenance.util';

/**
 * O PLANO AUTOMÁTICO de preventiva: uma máquina por dia útil, da mais urgente para a menos.
 *
 * Existe porque "oito máquinas vencidas" não é uma instrução — ninguém para o dia para abrir
 * oito computadores. Uma por dia útil é o ritmo que cabe no meio do atendimento, e transforma
 * uma lista de pendências numa fila que anda sozinha.
 *
 * O plano NÃO é guardado em lugar nenhum: ele é recalculado a cada leitura, a partir de quem
 * está vencido hoje. Guardá-lo significaria manter uma agenda que envelhece — a máquina que
 * foi aberta ontem continuaria marcada para quinta-feira.
 *
 * Fim de semana fica de fora: máquina se abre com gente na empresa.
 */

export type PlanCandidate = {
  computerId: number;
  computerName: string;
  department: string | null;
  /** Quando a máquina foi aberta pela última vez. Nulo quando nunca foi. */
  lastDoneAt: string | null;
};

export type PlannedDay = PlanCandidate & {
  plannedFor: Date;
  monthsSinceLast: number | null;
};

/** Sábado e domingo. Em JavaScript, 0 é domingo. */
function isWeekend(date: Date): boolean {
  const day = date.getDay();

  return day === 0 || day === 6;
}

/** O próximo dia útil a partir da data dada, incluindo a própria se ela já for útil. */
export function nextBusinessDay(from: Date): Date {
  const date = new Date(from);
  while (isWeekend(date)) date.setDate(date.getDate() + 1);

  return date;
}

/**
 * Quem vai antes.
 *
 * Quem NUNCA foi aberta vem na frente de todas — não se sabe o que tem lá dentro, e é a que
 * mais pode surpreender. Depois, a mais antiga. O nome desempata para o plano não mudar de
 * ordem a cada leitura só porque duas máquinas empataram.
 */
function byUrgency(a: PlanCandidate, b: PlanCandidate): number {
  if (a.lastDoneAt === null && b.lastDoneAt !== null) return -1;
  if (a.lastDoneAt !== null && b.lastDoneAt === null) return 1;

  if (a.lastDoneAt !== null && b.lastDoneAt !== null && a.lastDoneAt !== b.lastDoneAt) {
    return a.lastDoneAt < b.lastDoneAt ? -1 : 1;
  }

  return a.computerName.localeCompare(b.computerName, 'pt-BR');
}

/**
 * Monta o plano: só quem está vencido (ou nunca foi), um por dia útil, a partir de hoje.
 *
 * `limit` existe porque a tela mostra os próximos dias, não o ano inteiro — e um parque de
 * duzentas máquinas geraria um plano de quase um ano de calendário.
 */
export function buildMaintenancePlan(
  candidates: readonly PlanCandidate[],
  today: Date = new Date(),
  limit = 10,
): PlannedDay[] {
  const due = candidates.filter((candidate) => preventiveStatusOf(candidate.lastDoneAt) !== 'ok');
  const ordered = [...due].sort(byUrgency).slice(0, limit);

  const plan: PlannedDay[] = [];
  const cursor = nextBusinessDay(today);

  for (const candidate of ordered) {
    plan.push({
      ...candidate,
      plannedFor: new Date(cursor),
      monthsSinceLast: candidate.lastDoneAt ? monthsSince(candidate.lastDoneAt) : null,
    });

    cursor.setDate(cursor.getDate() + 1);
    while (isWeekend(cursor)) cursor.setDate(cursor.getDate() + 1);
  }

  return plan;
}

/** O que o plano manda fazer HOJE — nada, num fim de semana ou com tudo em dia. */
export function plannedForToday(plan: readonly PlannedDay[], today: Date = new Date()): PlannedDay[] {
  return plan.filter((entry) => isSameDay(entry.plannedFor, today));
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}
