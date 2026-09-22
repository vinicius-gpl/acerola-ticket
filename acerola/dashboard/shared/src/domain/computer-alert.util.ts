/**
 * QUANDO UMA MÁQUINA ENTRA E SAI DE ALERTA.
 *
 * Os limites são os mesmos do monitor do sistema antigo, e a razão de cada um é a mesma: a
 * máquina só é apontada quando está de fato travada para quem a usa, não quando um programa
 * deu um pico de dois segundos.
 *
 * **Abrir e fechar têm limites DIFERENTES, e isso é o ponto.** Com um limite só, uma máquina
 * oscilando em volta dele abriria e fecharia alerta a cada leitura — dezenas de episódios de
 * segundos para um único problema, e o histórico viraria ruído. A folga entre os dois valores
 * é o que faz um episódio ser um episódio.
 */

export const ALERT_METRICS = ['cpu', 'memory', 'disk'] as const;

export type AlertMetric = (typeof ALERT_METRICS)[number];

export const ALERT_METRIC_LABELS: Record<AlertMetric, string> = {
  cpu: 'Processador',
  memory: 'Memória',
  disk: 'Disco',
};

export function alertMetricLabel(metric: AlertMetric): string {
  return ALERT_METRIC_LABELS[metric];
}

/**
 * O valor a partir do qual o alerta ABRE.
 *
 * Processador e memória em 98% porque abaixo disso o Windows ainda responde; disco em 90%
 * ocupado (ou seja, menos de 10% livre) porque aí o sistema já não tem folga para atualizar
 * nem para arquivo temporário.
 */
export const ALERT_THRESHOLDS: Record<AlertMetric, number> = {
  cpu: 98,
  memory: 98,
  disk: 90,
};

/** O valor abaixo do qual o alerta FECHA. A distância para o de abertura é a folga. */
export const RECOVERY_THRESHOLDS: Record<AlertMetric, number> = {
  cpu: 90,
  memory: 90,
  disk: 85,
};

/** As três medidas de uma leitura, na forma que a regra precisa. */
export type AlertReading = {
  cpu: number;
  memory: number;
  disk: number;
};

export type AlertDecision = {
  /** Medidas que passaram do limite e ainda não tinham alerta aberto. */
  toOpen: AlertMetric[];
  /** Medidas que voltaram ao normal e tinham alerta aberto. */
  toClose: AlertMetric[];
  /** Medidas ainda acima do limite, com alerta aberto — o pico pode ter subido. */
  toRefresh: AlertMetric[];
};

export function isAboveThreshold(metric: AlertMetric, value: number): boolean {
  return value >= ALERT_THRESHOLDS[metric];
}

export function hasRecovered(metric: AlertMetric, value: number): boolean {
  return value < RECOVERY_THRESHOLDS[metric];
}

/**
 * O que fazer com esta leitura, dado o que já está aberto.
 *
 * Uma medida entre os dois limites (por exemplo, processador em 94%) não abre nem fecha nada:
 * se estava aberta continua aberta, se estava fechada continua fechada. É exatamente essa
 * zona morta que impede o liga-desliga.
 */
export function decideAlerts(
  reading: AlertReading,
  openMetrics: readonly AlertMetric[],
): AlertDecision {
  const open = new Set(openMetrics);
  const decision: AlertDecision = { toOpen: [], toClose: [], toRefresh: [] };

  for (const metric of ALERT_METRICS) {
    const action = actionFor(metric, reading[metric], open.has(metric));

    if (action === 'open') decision.toOpen.push(metric);
    if (action === 'refresh') decision.toRefresh.push(metric);
    if (action === 'close') decision.toClose.push(metric);
  }

  return decision;
}

type AlertAction = 'open' | 'refresh' | 'close' | 'none';

/**
 * O que uma única medida pede, isolado do laço.
 *
 * Separado para a decisão caber em duas frases: passou do limite? então abre, ou renova se já
 * estava aberta. Não passou? então fecha, mas só se já estava aberta E voltou abaixo do limite
 * de recuperação — entre os dois valores, nada acontece.
 */
function actionFor(metric: AlertMetric, value: number, isOpen: boolean): AlertAction {
  if (isAboveThreshold(metric, value)) return isOpen ? 'refresh' : 'open';
  if (isOpen && hasRecovered(metric, value)) return 'close';

  return 'none';
}

/**
 * A frase que descreve o episódio, para a tela e para o aviso.
 *
 * Ela diz o NÚMERO, não só "alto": quem lê precisa saber se bateu 98% ou 100% para decidir se
 * corre agora ou depois do almoço.
 */
export function describeAlert(metric: AlertMetric, peakValue: number): string {
  const value = peakValue.toFixed(0);

  if (metric === 'disk') return `Disco com ${value}% de uso`;

  return `${alertMetricLabel(metric)} em ${value}%`;
}

/**
 * Quanto tempo o episódio durou, em segundos. Nulo enquanto ele não terminou — é o que separa
 * "está travada agora" de "travou ontem por vinte minutos".
 */
export function alertDurationSeconds(startedAt: string, recoveredAt: string | null): number | null {
  if (!recoveredAt) return null;

  const start = Date.parse(startedAt);
  const end = Date.parse(recoveredAt);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;

  return Math.round((end - start) / 1000);
}
