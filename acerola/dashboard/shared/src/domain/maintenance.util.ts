/**
 * A MANUTENÇÃO de um computador: o que foi feito nele, e quando ele precisa de novo.
 *
 * As duas regras daqui vêm do sistema antigo, e cada uma existe por um motivo concreto:
 *
 * - **A cada três meses** toda máquina do parque precisa passar por manutenção. Era a régua
 *   do coletor antigo, e ela pega justamente o que ninguém lembra de fazer: limpeza e pasta
 *   térmica, que só aparecem como problema quando a máquina já está desligando sozinha.
 * - **Corretiva zera o relógio junto com a preventiva.** Quem abriu a máquina para trocar uma
 *   peça fez a mesma limpeza; cobrar preventiva de novo na semana seguinte seria mandar o
 *   técnico refazer o que ele acabou de fazer.
 */

export const MAINTENANCE_TYPES = [
  'preventive',
  'corrective',
  'part_replacement',
  'reinstall',
  'cleaning',
  'other',
] as const;

export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number];

/** A chave é inglês (o usuário não vê); o rótulo é português (vê). */
export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  preventive: 'Preventiva',
  corrective: 'Corretiva',
  part_replacement: 'Troca de peça',
  reinstall: 'Formatação/Reinstalação',
  cleaning: 'Limpeza',
  other: 'Outro',
};

export function maintenanceTypeLabel(type: MaintenanceType): string {
  return MAINTENANCE_TYPE_LABELS[type];
}

export type MaintenanceTypeTone = 'neutral' | 'info' | 'success' | 'warning' | 'brand';

/**
 * O tom de cada tipo.
 *
 * Corretiva é âmbar porque ela conta uma história: alguém teve problema. Preventiva é verde
 * porque é o trabalho que evita o problema. O resto é neutro — não há bom nem ruim em trocar
 * uma peça.
 */
const TYPE_TONES: Record<MaintenanceType, MaintenanceTypeTone> = {
  preventive: 'success',
  corrective: 'warning',
  part_replacement: 'info',
  reinstall: 'info',
  cleaning: 'neutral',
  other: 'neutral',
};

export function maintenanceTypeTone(type: MaintenanceType): MaintenanceTypeTone {
  return TYPE_TONES[type];
}

/**
 * Os tipos que valem como manutenção preventiva cumprida.
 *
 * Trocar uma peça ou formatar NÃO conta: são serviços pontuais, que podem acontecer sem
 * ninguém abrir a máquina para limpar. Contá-los faria o sistema anunciar em dia uma máquina
 * que não é aberta há um ano.
 */
export function resetsPreventiveClock(type: MaintenanceType): boolean {
  return type === 'preventive' || type === 'corrective';
}

/** Toda máquina do parque precisa de manutenção nesta cadência — a régua do sistema antigo. */
export const PREVENTIVE_INTERVAL_MONTHS = 3;

export const PREVENTIVE_STATUSES = ['ok', 'due', 'never'] as const;

export type PreventiveStatus = (typeof PREVENTIVE_STATUSES)[number];

export const PREVENTIVE_STATUS_LABELS: Record<PreventiveStatus, string> = {
  ok: 'Em dia',
  due: 'Vencida',
  never: 'Nunca feita',
};

export function preventiveStatusLabel(status: PreventiveStatus): string {
  return PREVENTIVE_STATUS_LABELS[status];
}

export function preventiveStatusTone(status: PreventiveStatus): 'success' | 'danger' | 'warning' {
  if (status === 'ok') return 'success';
  if (status === 'due') return 'danger';

  return 'warning';
}

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/** Quantos meses inteiros se passaram desde uma data. Meio mês não conta como mês. */
export function monthsSince(iso: string, now: number = Date.now()): number | null {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return null;
  /* Data no futuro é zero mês, nunca negativa: manutenção agendada para amanhã não pode
     deixar a máquina "menos vencida" do que uma feita hoje. */
  if (at > now) return 0;

  const days = (now - at) / MILLISECONDS_PER_DAY;

  /* 30,44 é a média de dias do mês do calendário. Contar mês por número do mês faria "31 de
     janeiro" e "1º de fevereiro" ficarem a um mês de distância. */
  return Math.floor(days / 30.44);
}

/**
 * Se a máquina está em dia, vencida, ou nunca passou por manutenção.
 *
 * "Nunca feita" é diferente de "vencida" de propósito: a primeira é uma máquina que entrou no
 * parque e ninguém tocou, e a segunda é uma que tem histórico e passou do prazo. As duas
 * pedem a mesma ação, mas a primeira também diz que o cadastro pode ser novo — e ninguém
 * precisa correr atrás de uma máquina cadastrada ontem.
 */
export function preventiveStatusOf(
  lastDoneAt: string | null | undefined,
  now: number = Date.now(),
): PreventiveStatus {
  if (!lastDoneAt) return 'never';

  const months = monthsSince(lastDoneAt, now);
  if (months === null) return 'never';

  return months >= PREVENTIVE_INTERVAL_MONTHS ? 'due' : 'ok';
}

/**
 * A partir de quantas manutenções uma máquina passa a ser candidata a troca.
 *
 * Três é o número do sistema antigo, e ele não é arbitrário: é a terceira vez que alguém
 * para o trabalho de uma pessoa para consertar o mesmo equipamento.
 */
export const FREQUENT_MAINTENANCE_COUNT = 3;

export function isFrequentlyServiced(count: number): boolean {
  return count >= FREQUENT_MAINTENANCE_COUNT;
}
