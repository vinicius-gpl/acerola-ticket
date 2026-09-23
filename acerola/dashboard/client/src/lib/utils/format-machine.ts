/**
 * Os números da máquina em PALAVRAS DE GENTE.
 *
 * O agente manda bytes e segundos porque é o que ele mede; ninguém lê "17179869184". A
 * tradução mora num lugar só para a mesma memória não aparecer "16 GB" na lista e
 * "17,18 GB" na ficha.
 */

const BYTES_PER_KB = 1024;

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/** Nulo é "ainda não sei" — traço. Zero medido é zero, e sai como zero. */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes < BYTES_PER_KB) return `${Math.round(bytes)} B`;

  let value = bytes;
  let unit = 0;

  while (value >= BYTES_PER_KB && unit < UNITS.length - 1) {
    value /= BYTES_PER_KB;
    unit += 1;
  }

  /* Uma casa decimal só a partir de GB: "239,4 MB" é precisão que não muda decisão nenhuma. */
  const decimals = unit >= 3 ? 1 : 0;

  return `${value.toFixed(decimals).replace('.', ',')} ${UNITS[unit]}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';

  return `${value.toFixed(0)}%`;
}

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;

/**
 * Há quanto tempo a máquina está ligada, na maior unidade que ainda faz sentido.
 *
 * "47 dias" responde a pergunta que se faz ("precisa reiniciar?"); "4.060.800 segundos" não.
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < SECONDS_PER_MINUTE) return `${Math.round(seconds)} s`;
  if (seconds < SECONDS_PER_HOUR) return `${Math.floor(seconds / SECONDS_PER_MINUTE)} min`;
  if (seconds < SECONDS_PER_DAY) return `${Math.floor(seconds / SECONDS_PER_HOUR)} h`;

  const days = Math.floor(seconds / SECONDS_PER_DAY);

  return days === 1 ? '1 dia' : `${days} dias`;
}

const MILLISECONDS_PER_MINUTE = 60 * 1000;

/**
 * "Agora mesmo", "há 4 minutos", "há 7 dias".
 *
 * A lista responde "esta máquina sumiu?", e a resposta é a DISTÂNCIA até agora — não a data.
 * Quem precisa do instante exato abre a ficha, onde a data completa aparece.
 *
 * `now` entra por parâmetro para o teste poder fixar o relógio: com `Date.now()` por dentro,
 * o mesmo teste passaria hoje e falharia amanhã.
 */
export function formatTimeAgo(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return 'nunca';

  const at = Date.parse(iso);
  if (Number.isNaN(at)) return '—';

  const minutes = Math.floor((now - at) / MILLISECONDS_PER_MINUTE);
  /* Relógio da máquina adiantado em alguns segundos não vira "daqui a pouco". */
  if (minutes < 1) return 'agora mesmo';
  if (minutes === 1) return 'há 1 minuto';
  if (minutes < 60) return `há ${minutes} minutos`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return 'há 1 hora';
  if (hours < 24) return `há ${hours} horas`;

  const days = Math.floor(hours / 24);

  return days === 1 ? 'há 1 dia' : `há ${days} dias`;
}
