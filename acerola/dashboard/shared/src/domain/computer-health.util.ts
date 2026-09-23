/**
 * A NOTA DE SAÚDE de um computador: 0 a 100, com os avisos que a baixaram.
 *
 * No sistema antigo essa conta vivia dentro do script PowerShell que rodava em cada máquina.
 * Isso tinha dois problemas: mudar a régua exigia reinstalar o coletor em todo mundo, e não
 * havia como testar a regra sem uma máquina de verdade na mão. Aqui ela é função pura — o
 * agente manda o que mediu, o servidor decide o que aquilo significa.
 *
 * **A régua só usa o que o agente realmente coleta.** O coletor antigo lia SMART do disco
 * (saúde, temperatura, desgaste de SSD) via WMI do Windows; o agente em Go usa gopsutil, que
 * não expõe isso em nenhum sistema. Inventar esses avisos a partir do que não foi medido seria
 * pior do que não tê-los — a tela mostraria um disco "saudável" que ninguém conferiu. Quando o
 * agente passar a ler SMART, os avisos entram aqui, e só aqui.
 */

export const HEALTH_STATUSES = ['good', 'attention', 'critical'] as const;

export type HealthStatus = (typeof HEALTH_STATUSES)[number];

/** O texto de tela. A chave é inglês (o usuário não vê); o rótulo é português (vê). */
export const HEALTH_STATUS_LABELS: Record<HealthStatus, string> = {
  good: 'Boa',
  attention: 'Atenção',
  critical: 'Crítica',
};

export function healthStatusLabel(status: HealthStatus): string {
  return HEALTH_STATUS_LABELS[status];
}

export type HealthStatusTone = 'success' | 'warning' | 'danger';

const STATUS_TONES: Record<HealthStatus, HealthStatusTone> = {
  good: 'success',
  attention: 'warning',
  critical: 'danger',
};

export function healthStatusTone(status: HealthStatus): HealthStatusTone {
  return STATUS_TONES[status];
}

export type HealthWarning = {
  severity: 'attention' | 'critical';
  message: string;
};

export type HealthReport = {
  score: number;
  status: HealthStatus;
  warnings: HealthWarning[];
};

/** O que o agente mede e que entra na conta. Tudo opcional: máquina nova pode não ter enviado. */
export type HealthInput = {
  totalMemoryBytes?: number | null;
  totalDiskBytes?: number | null;
  freeDiskBytes?: number | null;
  uptimeSeconds?: number | null;
};

const BYTES_PER_GB = 1024 ** 3;
const SECONDS_PER_DAY = 60 * 60 * 24;

/**
 * Abaixo disto o Windows já começa a usar disco como memória, e a máquina fica lenta para
 * qualquer trabalho de escritório. É a mesma régua do coletor antigo.
 */
const LOW_MEMORY_GB = 8;

/** Menos de 10% livre: o sistema não tem folga para atualizar nem para arquivo temporário. */
const LOW_DISK_FREE_PERCENT = 10;

/** Menos de 5%: o Windows passa a recusar gravação, e aí já é problema, não aviso. */
const CRITICAL_DISK_FREE_PERCENT = 5;

/**
 * Um mês ligada sem reiniciar normalmente significa atualização pendente esperando reinício.
 * Não é defeito — é a explicação mais comum para "está estranho desde não sei quando".
 */
const STALE_UPTIME_DAYS = 30;

/** Quanto cada aviso tira da nota. Crítico pesa o dobro de atenção. */
const ATTENTION_PENALTY = 12;
const CRITICAL_PENALTY = 25;

/** Abaixo disto a máquina é "Atenção" mesmo sem aviso — e "Crítica" mais abaixo ainda. */
const ATTENTION_SCORE = 80;
const CRITICAL_SCORE = 55;

export function diskFreePercent(input: HealthInput): number | null {
  const total = input.totalDiskBytes ?? 0;
  const free = input.freeDiskBytes;
  if (!total || free === null || free === undefined) return null;

  return (free / total) * 100;
}

export function memoryGb(input: HealthInput): number | null {
  if (!input.totalMemoryBytes) return null;

  return input.totalMemoryBytes / BYTES_PER_GB;
}

export function uptimeDays(input: HealthInput): number | null {
  const seconds = input.uptimeSeconds;
  if (seconds === null || seconds === undefined) return null;

  return seconds / SECONDS_PER_DAY;
}

/**
 * Os avisos, do mais grave para o menos.
 *
 * Cada um diz o NÚMERO que o disparou, e não só "pouco espaço": quem lê precisa saber se
 * faltam 9% ou 1% para decidir se corre hoje ou na semana que vem.
 */
export function healthWarnings(input: HealthInput): HealthWarning[] {
  const warnings: HealthWarning[] = [];

  warnings.push(...diskWarnings(input));

  const gb = memoryGb(input);
  if (gb !== null && gb < LOW_MEMORY_GB) {
    warnings.push({
      severity: 'attention',
      message: `Memória RAM abaixo de ${LOW_MEMORY_GB} GB: ${gb.toFixed(1).replace('.', ',')} GB`,
    });
  }

  const days = uptimeDays(input);
  if (days !== null && days > STALE_UPTIME_DAYS) {
    warnings.push({
      severity: 'attention',
      message: `Ligada há ${Math.floor(days)} dias sem reiniciar — pode haver atualização pendente`,
    });
  }

  return warnings;
}

/** Separado para a função de avisos não passar do teto de complexidade por causa do disco. */
function diskWarnings(input: HealthInput): HealthWarning[] {
  const free = diskFreePercent(input);
  if (free === null) return [];

  const rounded = free.toFixed(1).replace('.', ',');

  if (free < CRITICAL_DISK_FREE_PERCENT) {
    return [{ severity: 'critical', message: `Disco quase cheio: só ${rounded}% livre` }];
  }

  if (free < LOW_DISK_FREE_PERCENT) {
    return [{ severity: 'attention', message: `Pouco espaço livre no disco: ${rounded}% livre` }];
  }

  return [];
}

/**
 * A nota e a situação, juntas.
 *
 * Um aviso crítico derruba para "Crítica" mesmo que a nota ainda esteja alta: um disco sem
 * espaço não fica menos urgente porque o resto da máquina está bem.
 */
export function computeHealth(input: HealthInput): HealthReport {
  const warnings = healthWarnings(input);

  const penalty = warnings.reduce(
    (total, warning) =>
      total + (warning.severity === 'critical' ? CRITICAL_PENALTY : ATTENTION_PENALTY),
    0,
  );
  const score = Math.max(0, 100 - penalty);

  return { score, status: statusOf(score, warnings), warnings };
}

function statusOf(score: number, warnings: readonly HealthWarning[]): HealthStatus {
  if (warnings.some((warning) => warning.severity === 'critical')) return 'critical';
  if (score < CRITICAL_SCORE) return 'critical';
  if (warnings.length > 0 || score < ATTENTION_SCORE) return 'attention';

  return 'good';
}
