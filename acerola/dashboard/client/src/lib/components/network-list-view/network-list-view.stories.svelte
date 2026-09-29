<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import {
    type NetworkEvent,
    type NetworkSummary,
  } from '@template/shared/schemas/network-event.schema';

  import NetworkListView, { type NetworkFilter } from './network-list-view.svelte';

  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

  function event(over: Partial<NetworkEvent> = {}): NetworkEvent {
    return {
      id: 1,
      occurredAt: ago(25 * MINUTE),
      type: 'high_latency',
      severity: 'attention',
      title: 'Lentidão no link principal',
      message: 'Latência acima de 300 ms por mais de cinco minutos.',
      linkName: 'WAN1',
      provider: 'Link principal',
      latencyMs: 320,
      packetLossPercent: 2.4,
      source: 'UniFi',
      resolvedAt: null,
      resolvedBy: null,
      createdAt: ago(25 * MINUTE),
      ...over,
    };
  }

  const events: NetworkEvent[] = [
    event(),
    event({
      id: 2,
      type: 'wan_down',
      severity: 'critical',
      title: 'Internet caiu',
      message: 'O link principal parou de responder.',
      latencyMs: null,
      packetLossPercent: null,
      occurredAt: ago(30 * HOUR),
      resolvedAt: ago(30 * HOUR - 42 * MINUTE),
      resolvedBy: 'suporte@azuos.local',
    }),
    event({
      id: 3,
      type: 'wan_up',
      severity: 'info',
      title: 'Internet voltou',
      message: 'O link principal respondeu de novo depois de 42 minutos.',
      latencyMs: null,
      packetLossPercent: null,
      occurredAt: ago(30 * HOUR - 42 * MINUTE),
      resolvedAt: ago(30 * HOUR - 42 * MINUTE),
      resolvedBy: 'suporte@azuos.local',
    }),
    /* CASO LIMITE: aviso sem link, sem medida e sem detalhe — o mínimo que pode chegar. */
    event({
      id: 6,
      type: 'other',
      severity: 'info',
      title: 'Atualização de firmware disponível para o roteador',
      message: null,
      linkName: null,
      latencyMs: null,
      packetLossPercent: null,
      occurredAt: ago(9 * DAY),
      resolvedAt: ago(9 * DAY),
      resolvedBy: 'suporte@azuos.local',
    }),
  ];

  const summary: NetworkSummary = {
    days: 30,
    open: 2,
    outages: 3,
    totalOutageSeconds: 5400,
    worstLatencyMs: 320,
    worstPacketLossPercent: 8.1,
  };

  const emptyFilter: NetworkFilter = { type: '', severity: '', onlyOpen: false, days: 30 };

  const actions = {
    onTypeChange: () => {},
    onSeverityChange: () => {},
    onOnlyOpenChange: () => {},
    onPeriodChange: () => {},
    onClearFilters: () => {},
    onRetry: () => {},
    onResolveChange: () => {},
  };

  const settled = {
    isLoading: false,
    isEmpty: false,
    isFilteredOut: false,
    isTruncated: false,
    error: null,
  };

  const { Story } = defineMeta({
    title: 'Components/NetworkListView',
    component: NetworkListView,
  });
</script>

<Story
  name="Default"
  args={{
    data: { events, total: events.length, summary, filter: emptyFilter },
    state: settled,
    actions,
  }}
/>

<Story
  name="Loading"
  args={{
    data: { events: [], total: 0, summary: null, filter: emptyFilter },
    state: { ...settled, isLoading: true, isSummaryLoading: true },
    actions,
  }}
/>

<!-- Nenhum evento: o texto diz DE ONDE eles vêm, em vez de afirmar que a rede está bem. -->
<Story
  name="Empty"
  args={{
    data: {
      events: [],
      total: 0,
      summary: {
        days: 30,
        open: 0,
        outages: 0,
        totalOutageSeconds: null,
        worstLatencyMs: null,
        worstPacketLossPercent: null,
      },
      filter: emptyFilter,
    },
    state: { ...settled, isEmpty: true },
    actions,
  }}
/>

<Story
  name="Filtered out"
  args={{
    data: {
      events: [],
      total: 0,
      summary,
      filter: { type: 'failover', severity: 'critical', onlyOpen: true, days: 7 },
    },
    state: { ...settled, isFilteredOut: true },
    actions,
  }}
/>

<Story
  name="Error"
  args={{
    data: { events: [], total: 0, summary: null, filter: emptyFilter },
    state: { ...settled, error: 'Não consegui falar com o servidor. Confira se ele está rodando.' },
    actions,
  }}
/>

<!-- A internet fora AGORA: a linha em aberto, em vermelho. -->
<Story
  name="Internet down right now"
  args={{
    data: {
      events: [
        event({
          id: 9,
          type: 'wan_down',
          severity: 'critical',
          title: 'Internet caiu',
          latencyMs: null,
          packetLossPercent: null,
          occurredAt: ago(12 * MINUTE),
        }),
        ...events,
      ],
      total: 5,
      summary: { ...summary, open: 3 },
      filter: emptyFilter,
    },
    state: settled,
    actions,
  }}
/>
