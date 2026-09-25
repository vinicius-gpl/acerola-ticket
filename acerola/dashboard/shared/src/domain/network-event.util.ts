/**
 * OS EVENTOS DE REDE: quando a internet caiu, quando voltou, e o que estava ruim.
 *
 * Quem produz esses eventos é o UniFi, pelo webhook — o sistema não mede a rede, ele
 * REGISTRA o que o equipamento avisou. A diferença importa: o que não chegou aqui não
 * aconteceu para esta tela, e por isso o silêncio nunca deve ser lido como "estava tudo bem".
 *
 * Os tipos são os alertas que o sistema antigo configurava no Alarm Manager do UniFi.
 */

export const NETWORK_EVENT_TYPES = [
  'wan_down',
  'wan_up',
  'failover',
  'high_latency',
  'packet_loss',
  'other',
] as const;

export type NetworkEventType = (typeof NETWORK_EVENT_TYPES)[number];

/** A chave é inglês (o usuário não vê); o rótulo é português (vê). */
export const NETWORK_EVENT_TYPE_LABELS: Record<NetworkEventType, string> = {
  wan_down: 'Internet caiu',
  wan_up: 'Internet voltou',
  failover: 'Trocou de link',
  high_latency: 'Lentidão',
  packet_loss: 'Perda de pacote',
  other: 'Outro aviso',
};

export function networkEventTypeLabel(type: NetworkEventType): string {
  return NETWORK_EVENT_TYPE_LABELS[type];
}

export const NETWORK_SEVERITIES = ['info', 'attention', 'critical'] as const;

export type NetworkSeverity = (typeof NETWORK_SEVERITIES)[number];

export const NETWORK_SEVERITY_LABELS: Record<NetworkSeverity, string> = {
  info: 'Aviso',
  attention: 'Atenção',
  critical: 'Grave',
};

export function networkSeverityLabel(severity: NetworkSeverity): string {
  return NETWORK_SEVERITY_LABELS[severity];
}

export function networkSeverityTone(
  severity: NetworkSeverity,
): 'neutral' | 'warning' | 'danger' {
  if (severity === 'critical') return 'danger';
  if (severity === 'attention') return 'warning';

  return 'neutral';
}

/**
 * A gravidade de cada tipo, quando o UniFi não manda uma.
 *
 * A internet cair é GRAVE e ponto: o escritório inteiro para. Lentidão e perda de pacote são
 * atenção — incomodam, mas dá para trabalhar. "Voltou" é só notícia boa, e entra como aviso
 * para aparecer na linha do tempo sem puxar o olho.
 */
const DEFAULT_SEVERITY: Record<NetworkEventType, NetworkSeverity> = {
  wan_down: 'critical',
  wan_up: 'info',
  failover: 'attention',
  high_latency: 'attention',
  packet_loss: 'attention',
  other: 'info',
};

export function defaultSeverityOf(type: NetworkEventType): NetworkSeverity {
  return DEFAULT_SEVERITY[type];
}

/**
 * O tipo do evento a partir do texto que o UniFi mandou.
 *
 * O Alarm Manager não tem um campo de tipo padronizado: cada alerta chega com um título
 * próprio, em inglês, e o que dá para fazer é reconhecer as palavras que aparecem neles. O
 * que não for reconhecido vira `other` — nunca é descartado, porque um aviso que ninguém
 * classificou ainda é um aviso, e a rede caindo sem ninguém ver é o pior resultado possível.
 */
export function classifyEvent(text: string | null | undefined): NetworkEventType {
  const normalized = (text ?? '').toLowerCase();

  if (/(wan|internet|uplink).*(down|offline|lost|outage)|outage/.test(normalized)) {
    return 'wan_down';
  }
  if (/(wan|internet|uplink).*(up|online|restored|recovered)|restored/.test(normalized)) {
    return 'wan_up';
  }
  if (/failover|switched to/.test(normalized)) return 'failover';
  if (/latency|slow/.test(normalized)) return 'high_latency';
  if (/packet loss|packet-loss|packetloss/.test(normalized)) return 'packet_loss';

  return 'other';
}

/**
 * Quanto tempo o problema durou, em segundos. Nulo enquanto ele não terminou — é o que
 * separa "está fora agora" de "caiu ontem por vinte minutos".
 */
export function outageDurationSeconds(
  startedAt: string,
  resolvedAt: string | null,
): number | null {
  if (!resolvedAt) return null;

  const start = Date.parse(startedAt);
  const end = Date.parse(resolvedAt);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;

  return Math.round((end - start) / 1000);
}
