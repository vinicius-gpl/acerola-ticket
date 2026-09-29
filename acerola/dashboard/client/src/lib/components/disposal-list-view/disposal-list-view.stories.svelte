<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type Computer } from '@template/shared/schemas/computer.schema';

  import DisposalListView, {
    type DisposalFilter,
    type DisposalSummary,
  } from './disposal-list-view.svelte';

  const GB = 1024 ** 3;

  function computer(over: Partial<Computer> = {}): Computer {
    return {
      id: 9,
      name: 'RECEPCAO-09',
      displayName: 'Recepção — micro antigo do balcão',
      responsibleName: 'Bia Costa',
      department: 'recepcao',
      hardware: {
        os: 'Microsoft Windows 10 Pro',
        platform: 'windows',
        platformVersion: null,
        kernelVersion: null,
        arch: 'amd64',
        cpuModel: 'Intel Core i3-3220',
        logicalCpus: 4,
        physicalCpus: 2,
        totalMemoryBytes: 4 * GB,
        macAddress: null,
        localIp: null,
        totalDiskBytes: 120 * GB,
        freeDiskBytes: 30 * GB,
        uptimeSeconds: null,
        bootTime: null,
      },
      healthScore: 88,
      healthStatus: 'attention',
      warnings: [],
      isOnline: false,
      lastSeenAt: '2026-03-01T12:00:00.000Z',
      agentVersion: '0.9.0',
      isArchived: false,
      isBlocked: false,
      blockReason: null,
      disposedAt: '2026-08-09T12:00:00.000Z',
      disposalType: 'defect',
      disposalReason: 'Fonte queimada duas vezes no mesmo semestre; peças aproveitadas.',
      createdAt: '2026-05-01T12:00:00.000Z',
      createdBy: 'suporte@azuos.local',
      updatedAt: null,
      updatedBy: null,
      ...over,
    };
  }

  const computers: Computer[] = [
    computer(),
    computer({
      id: 10,
      name: 'FISCAL-10',
      displayName: 'Fiscal — micro que pegou raio',
      department: 'fiscal',
      disposalType: 'scrap',
      disposalReason: 'Placa-mãe queimada em descarga elétrica; sem conserto.',
      disposedAt: '2026-05-28T12:00:00.000Z',
    }),
    /* CASO LIMITE: motivo comprido, que precisa quebrar linha em vez de esticar a tabela. */
    computer({
      id: 11,
      name: 'PARALEGAL-11-ESTACAO-COMPARTILHADA',
      displayName: 'Paralegal — estação compartilhada do corredor',
      department: 'paralegal',
      disposalReason:
        'Travava três vezes por semana desde a troca do disco; o técnico externo não achou defeito, e o custo de continuar investigando passou do valor de uma máquina nova.',
    }),
  ];

  const summary: DisposalSummary = { total: 3, defect: 2, scrap: 1 };

  const emptyFilter: DisposalFilter = { search: '', type: '' };

  const actions = {
    onSearchChange: () => {},
    onTypeChange: () => {},
    onClearFilters: () => {},
    onRetry: () => {},
    onOpenMachine: () => {},
    onAskRestore: () => {},
    onCancelRestore: () => {},
    onConfirmRestore: () => {},
  };

  const settled = { isLoading: false, isEmpty: false, isFilteredOut: false, error: null };

  const { Story } = defineMeta({
    title: 'Components/DisposalListView',
    component: DisposalListView,
  });
</script>

<Story
  name="Default"
  args={{
    data: { computers, total: computers.length, summary, filter: emptyFilter, restoring: null },
    state: settled,
    actions,
  }}
/>

<Story
  name="Loading"
  args={{
    data: {
      computers: [],
      total: 0,
      summary: { total: 0, defect: 0, scrap: 0 },
      filter: emptyFilter,
      restoring: null,
    },
    state: { ...settled, isLoading: true },
    actions,
  }}
/>

<!-- Nada descartado: boa notícia, e o texto diz onde a ação acontece. -->
<Story
  name="Empty"
  args={{
    data: {
      computers: [],
      total: 0,
      summary: { total: 0, defect: 0, scrap: 0 },
      filter: emptyFilter,
      restoring: null,
    },
    state: { ...settled, isEmpty: true },
    actions,
  }}
/>

<Story
  name="Filtered out"
  args={{
    data: {
      computers: [],
      total: 0,
      summary,
      filter: { search: 'notebook', type: 'scrap' },
      restoring: null,
    },
    state: { ...settled, isFilteredOut: true },
    actions,
  }}
/>

<!-- A pergunta antes de devolver ao inventário. -->
<Story
  name="Confirming restore"
  args={{
    data: {
      computers,
      total: computers.length,
      summary,
      filter: emptyFilter,
      restoring: computers[0]!,
    },
    state: settled,
    actions,
  }}
/>

<Story
  name="Error"
  args={{
    data: {
      computers: [],
      total: 0,
      summary: { total: 0, defect: 0, scrap: 0 },
      filter: emptyFilter,
      restoring: null,
    },
    state: { ...settled, error: 'Não consegui falar com o servidor. Confira se ele está rodando.' },
    actions,
  }}
/>
