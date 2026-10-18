/**
 * O fuso das rotinas diárias: Brasília, UTC−3.
 *
 * Fixo, e não lido do sistema operacional: o container roda em UTC, e o Brasil não tem horário
 * de verão desde 2019. "Meia-noite" aqui é a meia-noite de quem usa o sistema, não a do servidor.
 */
export const BRASILIA_UTC_OFFSET_HOURS = -3;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * O próximo instante em que o relógio de Brasília marca `hour:00`, estritamente depois de `now`.
 *
 * Exatamente na hora conta como "já passou": quem acabou de rodar às 00:00 agenda a próxima
 * para o dia seguinte, e não para agora de novo.
 */
export function nextBrasiliaTime(now: Date, hour: number): Date {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new RangeError(`hour must be an integer between 0 and 23, got ${hour}`);
  }

  const utcHour = hour - BRASILIA_UTC_OFFSET_HOURS;
  const candidate = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), utcHour);
  /* O dia em UTC pode estar um à frente do de Brasília (entre 21h e meia-noite de lá); recuar
     um dia antes de comparar evita pular a execução daquela noite. */
  let next = candidate - DAY_MS;
  while (next <= now.getTime()) next += DAY_MS;

  return new Date(next);
}

/** Quanto falta, em milissegundos, para o próximo `hour:00` de Brasília. */
export function msUntilBrasiliaTime(now: Date, hour: number): number {
  return nextBrasiliaTime(now, hour).getTime() - now.getTime();
}

/**
 * O mês corrente no calendário de Brasília: o instante em que ele começa e o em que o próximo
 * começa (fim exclusivo), mais o ano e o mês (0–11) de lá.
 *
 * Sem isto, o mês seguia o relógio do servidor (UTC): o que acontecesse das 21h à meia-noite do
 * último dia, em Brasília, caía no mês seguinte.
 */
export function brasiliaMonthRange(now: Date): {
  start: Date;
  end: Date;
  year: number;
  month: number;
} {
  const local = new Date(now.getTime() + BRASILIA_UTC_OFFSET_HOURS * HOUR_MS);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const offset = -BRASILIA_UTC_OFFSET_HOURS;

  return {
    start: new Date(Date.UTC(year, month, 1, offset)),
    end: new Date(Date.UTC(year, month + 1, 1, offset)),
    year,
    month,
  };
}
