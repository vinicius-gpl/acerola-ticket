<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type MaintenanceEntry } from '@template/shared/schemas/dashboard.schema';

  import DashboardMaintenanceLog from './acerola-dashboard-maintenance-log.svelte';

  function entry(id: number, computerName: string, over: Partial<MaintenanceEntry> = {}) {
    return {
      id,
      computerName,
      type: 'preventive',
      description: 'Limpeza interna e troca de pasta térmica',
      performedBy: 'Carlos',
      performedAt: '2026-09-23T12:00:00.000Z',
      ...over,
    };
  }

  const log = {
    day: [entry(1, 'CONTABIL-03')],
    week: [
      entry(1, 'CONTABIL-03'),
      entry(2, 'FISCAL-01', { type: 'hardware', description: 'Troca do SSD' }),
      entry(3, 'RECEPCAO-02', { type: 'formatting', performedBy: null }),
    ],
    month: Array.from({ length: 12 }, (_value, index) =>
      entry(index + 1, `MAQUINA-${String(index + 1).padStart(2, '0')}`),
    ),
  };

  const planned = [
    {
      computerId: 3,
      computerName: 'CONTABIL-03',
      department: 'contabil' as const,
      plannedFor: '2026-09-29T12:00:00.000Z',
      monthsSinceLast: 5,
    },
  ];

  const { Story } = defineMeta({
    title: 'Features/Dashboard/AcerolaDashboardMaintenanceLog',
    component: DashboardMaintenanceLog,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default" args={{ data: { log, plannedToday: [], isDoneToday: false } }} />

<!-- O plano de hoje cobrando: é a única parte do bloco que pede ação. -->
<Story name="PlanPending" args={{ data: { log, plannedToday: planned, isDoneToday: false } }} />

<!-- E o plano de hoje já cumprido. -->
<Story name="PlanDone" args={{ data: { log, plannedToday: planned, isDoneToday: true } }} />

<Story
  name="Loading"
  args={{
    data: { log: { day: [], week: [], month: [] }, plannedToday: [], isDoneToday: false },
    state: { isLoading: true },
  }}
/>

<Story
  name="Empty"
  args={{ data: { log: { day: [], week: [], month: [] }, plannedToday: [], isDoneToday: false } }}
/>

<!-- Caso limite: máquina que nunca foi aberta, que é diferente de "há 0 meses". -->
<Story
  name="NeverOpened"
  args={{
    data: {
      log,
      plannedToday: [{ ...planned[0]!, monthsSinceLast: null }],
      isDoneToday: false,
    },
  }}
/>

<!-- Caso limite: na largura de um celular, com o recorte do mês (a lista rola dentro do bloco). -->
<Story name="OnPhone">
  <div class="w-[360px]">
    <DashboardMaintenanceLog data={{ log, plannedToday: planned, isDoneToday: false }} />
  </div>
</Story>
