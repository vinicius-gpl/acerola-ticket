<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import {
    type Maintenance,
    type PreventiveDue,
  } from '@template/shared/schemas/maintenance.schema';

  import MaintenanceListView, {
    type MaintenanceListFilter,
  } from './maintenance-list-view.svelte';

  const DAY = 24 * 60 * 60 * 1000;
  const daysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString();

  function maintenance(over: Partial<Maintenance> = {}): Maintenance {
    return {
      id: 1,
      computerId: 3,
      computerName: 'CONTABIL-03',
      computerDisplayName: 'Contábil — mesa do fechamento',
      computerDepartment: 'contabil',
      otherMachine: null,
      type: 'corrective',
      description: 'Máquina desligando sozinha: cooler do processador substituído.',
      performedBy: 'Carlos (assistência externa)',
      performedAt: daysAgo(35),
      createdAt: daysAgo(35),
      createdBy: 'suporte@azuos.local',
      updatedAt: null,
      updatedBy: null,
      ...over,
    };
  }

  const maintenances: Maintenance[] = [
    maintenance({
      id: 7,
      computerId: null,
      computerName: null,
      computerDisplayName: null,
      computerDepartment: null,
      otherMachine: 'Impressora da recepção (Brother DCP-L2540)',
      description: 'Atolamento de papel: rolete de tração limpo.',
      performedAt: daysAgo(12),
    }),
    maintenance({
      id: 1,
      computerId: 1,
      computerName: 'RECEPCAO-01',
      computerDisplayName: 'Recepção — balcão',
      computerDepartment: 'recepcao',
      type: 'preventive',
      description: 'Limpeza interna, troca da pasta térmica e verificação dos cabos.',
      performedBy: 'Suporte TI',
      performedAt: daysAgo(20),
    }),
    maintenance(),
    /* CASO LIMITE: lançado correndo, sem descrição e sem responsável. */
    maintenance({
      id: 8,
      computerId: 6,
      computerName: 'CS-06',
      computerDisplayName: 'CS — máquina de estágio',
      computerDepartment: 'cs',
      type: 'other',
      description: null,
      performedBy: null,
      performedAt: daysAgo(60),
    }),
  ];

  const preventive: PreventiveDue[] = [
    {
      computerId: 2,
      computerName: 'FINANCEIRO-02',
      computerDisplayName: 'Financeiro — mesa 2',
      computerDepartment: 'financeiro',
      lastDoneAt: daysAgo(150),
      status: 'due',
      maintenanceCount: 3,
    },
    {
      computerId: 1,
      computerName: 'RECEPCAO-01',
      computerDisplayName: 'Recepção — balcão',
      computerDepartment: 'recepcao',
      lastDoneAt: daysAgo(20),
      status: 'ok',
      maintenanceCount: 1,
    },
  ];

  const emptyFilter: MaintenanceListFilter = { search: '', type: '', computerId: null };

  const actions = {
    onSearchChange: () => {},
    onTypeChange: () => {},
    onClearFilters: () => {},
    onRetry: () => {},
    onRegister: () => {},
    onEdit: () => {},
    onAskRemove: () => {},
    onCancelRemove: () => {},
    onConfirmRemove: () => {},
  };

  const settled = {
    isLoading: false,
    isEmpty: false,
    isFilteredOut: false,
    isTruncated: false,
    error: null,
  };

  const { Story } = defineMeta({
    title: 'Components/MaintenanceListView',
    component: MaintenanceListView,
  });
</script>

<Story
  name="Default"
  args={{
    data: {
      maintenances,
      total: maintenances.length,
      preventive,
      filter: emptyFilter,
      removing: null,
    },
    state: settled,
    actions,
  }}
/>

<Story
  name="Loading"
  args={{
    data: { maintenances: [], total: 0, preventive: [], filter: emptyFilter, removing: null },
    state: { ...settled, isLoading: true, isPreventiveLoading: true },
    actions,
  }}
/>

<!-- Nada registrado ainda: o próximo passo é registrar o primeiro serviço. -->
<Story
  name="Empty"
  args={{
    data: { maintenances: [], total: 0, preventive, filter: emptyFilter, removing: null },
    state: { ...settled, isEmpty: true },
    actions,
  }}
/>

<!-- Filtro escondeu tudo: o próximo passo é outro. -->
<Story
  name="Filtered out"
  args={{
    data: {
      maintenances: [],
      total: 0,
      preventive,
      filter: { ...emptyFilter, search: 'impressora', type: 'preventive' },
      removing: null,
    },
    state: { ...settled, isFilteredOut: true },
    actions,
  }}
/>

<Story
  name="Error"
  args={{
    data: { maintenances: [], total: 0, preventive: [], filter: emptyFilter, removing: null },
    state: { ...settled, error: 'Não consegui falar com o servidor. Confira se ele está rodando.' },
    actions,
  }}
/>

<!-- A pergunta antes de excluir, com o registro nomeado. -->
<Story
  name="Confirming delete"
  args={{
    data: {
      maintenances,
      total: maintenances.length,
      preventive,
      filter: emptyFilter,
      removing: maintenances[2]!,
    },
    state: settled,
    actions,
  }}
/>

<!-- Lista cortada: a tela diz o tamanho real, em vez de truncar calada. -->
<Story
  name="Truncated"
  args={{
    data: { maintenances, total: 320, preventive, filter: emptyFilter, removing: null },
    state: { ...settled, isTruncated: true },
    actions,
  }}
/>
