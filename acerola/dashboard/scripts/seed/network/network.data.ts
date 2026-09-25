import { type NetworkEventInsert } from '../../../server/src/lib/db/schema/network-events.schema';

/**
 * Os eventos de rede de teste. VERSIONADOS: toda máquina que rodar o seed vê isto.
 *
 * Eventos INVENTADOS. Nome de provedor real, IP de equipamento e endereço de controlador não
 * entram aqui — este arquivo vai para o git e fica no histórico.
 *
 * As datas são RELATIVAS ao momento do seed: a tela mostra "nos últimos 30 dias", e com data
 * fixa ela nasceria vazia alguns meses depois do commit.
 */
const NOW = Date.now();

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const minutesAgo = (minutes: number) => new Date(NOW - minutes * MINUTE);
const hoursAgo = (hours: number) => new Date(NOW - hours * HOUR);
const daysAgo = (days: number) => new Date(NOW - days * DAY);

export const NETWORK_EVENTS_SEED: NetworkEventInsert[] = [
  /* EM ABERTO: a lentidão de agora. É o que a tela precisa mostrar em vermelho no topo. */
  {
    id: 1,
    occurredAt: minutesAgo(25),
    type: 'high_latency',
    severity: 'attention',
    title: 'Lentidão no link principal',
    message: 'Latência acima de 300 ms por mais de cinco minutos.',
    linkName: 'WAN1',
    provider: 'Link principal',
    latencyMs: 320,
    packetLossPercent: 2.4,
    source: 'UniFi',
    createdAt: minutesAgo(25),
  },

  /* Uma queda que já voltou: o par caiu/voltou é o caso mais comum do dia a dia. */
  {
    id: 2,
    occurredAt: hoursAgo(30),
    type: 'wan_down',
    severity: 'critical',
    title: 'Internet caiu',
    message: 'O link principal parou de responder.',
    linkName: 'WAN1',
    provider: 'Link principal',
    source: 'UniFi',
    resolvedAt: new Date(NOW - 30 * HOUR + 42 * MINUTE),
    resolvedBy: 'suporte@azuos.local',
    createdAt: hoursAgo(30),
  },
  {
    id: 3,
    occurredAt: new Date(NOW - 30 * HOUR + 42 * MINUTE),
    type: 'wan_up',
    severity: 'info',
    title: 'Internet voltou',
    message: 'O link principal respondeu de novo depois de 42 minutos.',
    linkName: 'WAN1',
    provider: 'Link principal',
    source: 'UniFi',
    resolvedAt: new Date(NOW - 30 * HOUR + 42 * MINUTE),
    resolvedBy: 'suporte@azuos.local',
    createdAt: new Date(NOW - 30 * HOUR + 42 * MINUTE),
  },

  /* Troca de link: o backup assumiu sozinho, e ninguém percebeu na hora. */
  {
    id: 4,
    occurredAt: daysAgo(6),
    type: 'failover',
    severity: 'attention',
    title: 'Trocou para o link de backup',
    message: 'O roteador passou o tráfego para a WAN2 automaticamente.',
    linkName: 'WAN2',
    provider: 'Link de backup',
    source: 'UniFi',
    resolvedAt: daysAgo(6),
    resolvedBy: 'suporte@azuos.local',
    createdAt: daysAgo(6),
  },

  /* Queda mais longa, do mês passado: é ela que faz o total de tempo fora do ar subir. */
  {
    id: 5,
    occurredAt: daysAgo(18),
    type: 'wan_down',
    severity: 'critical',
    title: 'Internet caiu',
    message: 'Rompimento de fibra na rua; o provedor confirmou por telefone.',
    linkName: 'WAN1',
    provider: 'Link principal',
    source: 'Manual',
    resolvedAt: new Date(NOW - 18 * DAY + 3 * HOUR),
    resolvedBy: 'suporte@azuos.local',
    createdAt: daysAgo(18),
  },

  /* CASO LIMITE: aviso que o UniFi mandou e ninguém classificou — entra como "outro" e não
     se perde. */
  {
    id: 6,
    occurredAt: daysAgo(9),
    type: 'other',
    severity: 'info',
    title: 'Atualização de firmware disponível para o roteador',
    message: null,
    linkName: null,
    source: 'UniFi',
    resolvedAt: daysAgo(9),
    resolvedBy: 'suporte@azuos.local',
    createdAt: daysAgo(9),
  },

  /* Perda de pacote em aberto, de ontem: dois problemas em pé ao mesmo tempo. */
  {
    id: 7,
    occurredAt: daysAgo(1),
    type: 'packet_loss',
    severity: 'attention',
    title: 'Perda de pacote no link principal',
    message: 'Perda média de 8% durante o horário comercial.',
    linkName: 'WAN1',
    provider: 'Link principal',
    packetLossPercent: 8.1,
    latencyMs: 180,
    source: 'UniFi',
    createdAt: daysAgo(1),
  },
];
