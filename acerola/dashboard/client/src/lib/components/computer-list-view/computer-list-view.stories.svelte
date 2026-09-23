<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type Computer } from '@template/shared/schemas/computer.schema';

  import ComputerListView, {
    type ComputerListFilter,
    type ComputerSummary,
  } from './computer-list-view.svelte';

  const GB = 1024 ** 3;

  function computer(over: Partial<Computer> = {}): Computer {
    return {
      id: 1,
      name: 'RECEPCAO-01',
      displayName: 'Recepção — balcão',
      responsibleName: 'Bia Costa',
      department: 'recepcao',
      hardware: {
        os: 'Microsoft Windows 11 Pro',
        platform: 'windows',
        platformVersion: '10.0.26100',
        kernelVersion: '10.0.26100',
        arch: 'amd64',
        cpuModel: 'Intel Core i5-12400',
        logicalCpus: 12,
        physicalCpus: 6,
        totalMemoryBytes: 16 * GB,
        macAddress: '00:00:5E:00:53:01',
        localIp: '198.51.100.11',
        totalDiskBytes: 480 * GB,
        freeDiskBytes: 210 * GB,
        uptimeSeconds: 3 * 24 * 60 * 60,
        bootTime: '2026-09-20T09:00:00.000Z',
      },
      healthScore: 100,
      healthStatus: 'good',
      warnings: [],
      isOnline: true,
      lastSeenAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      agentVersion: '1.0.0',
      isArchived: false,
      isBlocked: false,
      blockReason: null,
      createdAt: '2026-05-01T12:00:00.000Z',
      createdBy: 'suporte@azuos.local',
      updatedAt: null,
      updatedBy: null,
      ...over,
    };
  }

  const computers: Computer[] = [
    computer({
      id: 3,
      name: 'CONTABIL-03',
      displayName: 'Contábil — mesa do fechamento',
      responsibleName: 'Daniela Prado',
      department: 'contabil',
      healthScore: 63,
      healthStatus: 'critical',
      warnings: [{ severity: 'critical', message: 'Disco quase cheio: só 2,8% livre' }],
    }),
    computer({
      id: 2,
      name: 'FINANCEIRO-02',
      displayName: 'Financeiro — mesa 2',
      responsibleName: 'Carlos Menezes',
      department: 'financeiro',
      healthScore: 88,
      healthStatus: 'attention',
      warnings: [{ severity: 'attention', message: 'Memória RAM abaixo de 8 GB: 4,0 GB' }],
    }),
    computer(),
    /* Cadastrada e agente nunca instalado: a lista precisa dizer "nunca", não "agora mesmo". */
    computer({
      id: 4,
      name: 'FISCAL-04',
      displayName: 'Fiscal — máquina nova, agente pendente',
      responsibleName: 'Eduardo Lima',
      department: 'fiscal',
      isOnline: false,
      lastSeenAt: null,
      agentVersion: null,
    }),
    computer({
      id: 6,
      name: 'CS-06',
      displayName: 'CS — máquina de estágio',
      responsibleName: 'Gustavo Alves',
      department: 'cs',
      isOnline: false,
      isBlocked: true,
      blockReason: 'Máquina devolvida ao fornecedor.',
    }),
  ];

  /* CASO LIMITE: nome comprido em tudo. A linha precisa quebrar, não empurrar o botão. */
  const longNamed = computer({
    id: 8,
    name: 'PARALEGAL-08-ESTACAO-COMPARTILHADA',
    displayName: 'Paralegal — estação compartilhada do corredor (usada por mais de uma pessoa)',
    responsibleName: 'Isabela Marques de Oliveira e Souza Rodrigues',
    department: 'paralegal',
  });

  const summary: ComputerSummary = {
    total: 8,
    online: 3,
    critical: 2,
    attention: 1,
    neverSeen: 1,
  };

  const emptyFilter: ComputerListFilter = {
    search: '',
    department: '',
    healthStatus: '',
    includeArchived: false,
  };

  const actions = {
    onSearchChange: () => {},
    onDepartmentChange: () => {},
    onHealthStatusChange: () => {},
    onArchivedChange: () => {},
    onClearFilters: () => {},
    onRetry: () => {},
    onOpen: () => {},
    onRegister: () => {},
  };

  const settled = {
    isLoading: false,
    isEmpty: false,
    isFilteredOut: false,
    isTruncated: false,
    error: null,
  };

  const { Story } = defineMeta({
    title: 'Components/ComputerListView',
    component: ComputerListView,
  });
</script>

<Story
  name="Default"
  args={{
    data: { computers, total: computers.length, summary, filter: emptyFilter },
    state: settled,
    actions,
  }}
/>

<Story
  name="Loading"
  args={{
    data: { computers: [], total: 0, summary: null, filter: emptyFilter },
    state: { ...settled, isLoading: true, isSummaryLoading: true },
    actions,
  }}
/>

<!-- Nenhuma máquina ainda: o próximo passo é cadastrar a primeira. -->
<Story
  name="Empty"
  args={{
    data: {
      computers: [],
      total: 0,
      summary: { total: 0, online: 0, critical: 0, attention: 0, neverSeen: 0 },
      filter: emptyFilter,
    },
    state: { ...settled, isEmpty: true },
    actions,
  }}
/>

<!-- Existem máquinas, mas o filtro escondeu todas: o próximo passo é outro. -->
<Story
  name="Filtered out"
  args={{
    data: {
      computers: [],
      total: 0,
      summary,
      filter: { ...emptyFilter, search: 'máquina do porão', healthStatus: 'critical' },
    },
    state: { ...settled, isFilteredOut: true },
    actions,
  }}
/>

<Story
  name="Error"
  args={{
    data: { computers: [], total: 0, summary: null, filter: emptyFilter },
    state: { ...settled, error: 'Não consegui falar com o servidor. Confira se ele está rodando.' },
    actions,
  }}
/>

<!-- Lista cortada: a tela diz o tamanho real, em vez de truncar calada. -->
<Story
  name="Truncated"
  args={{
    data: { computers, total: 240, summary, filter: emptyFilter },
    state: { ...settled, isTruncated: true },
    actions,
  }}
/>

<!-- CASO LIMITE: uma máquina só, com nome comprido em todos os campos. -->
<Story
  name="Long names"
  args={{
    data: { computers: [longNamed], total: 1, summary, filter: emptyFilter },
    state: settled,
    actions,
  }}
/>
