<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type MaintenanceDashboard } from '@template/shared/schemas/maintenance-dashboard.schema';
  import { type InventoryMovement } from '@template/shared/schemas/inventory-movement.schema';
  import { fn } from 'storybook/test';

  import MaintenanceDashboardView from './acerola-maintenance-dashboard-view.svelte';

  function movement(overrides: Partial<InventoryMovement> = {}): InventoryMovement {
    return {
      id: 1,
      itemId: 4,
      itemName: 'Café torrado e moído 500 g',
      itemUnit: 'package',
      type: 'in',
      quantity: 4,
      balanceAfter: 7,
      reason: null,
      note: null,
      createdAt: '2026-09-29T12:00:00.000Z',
      createdBy: 'manutencao@azuos.local',
      ...overrides,
    };
  }

  const summary: MaintenanceDashboard = {
    inventory: { products: 14, outOfStock: 2 },
    quotes: { pending: 4, pendingAmountCents: 5643000, approvedAmountCents: 68000 },
    disposals: { units: 2 },
    recentMovements: [
      movement(),
      movement({ id: 2, itemName: 'Açúcar refinado', itemUnit: 'kilogram', type: 'out', quantity: 5 }),
      movement({
        id: 3,
        itemName: 'Cadeira giratória com apoio de braço',
        itemUnit: 'unit',
        type: 'disposal',
        quantity: 1,
        reason: 'broken',
      }),
    ],
  };

  const tickets = { open: 3, inProgress: 2, waiting: 1 };

  const settled = { isLoading: false, isTicketsLoading: false, error: null };

  const actions = {
    onRetry: fn(),
    onOpenTickets: fn(),
    onOpenStock: fn(),
    onOpenQuotes: fn(),
    onOpenDisposal: fn(),
  };

  const { Story } = defineMeta({
    title: 'Features/MaintenanceDashboard/AcerolaMaintenanceDashboardView',
    component: MaintenanceDashboardView,
  });
</script>

<!-- O uso mais comum: há o que fazer em todas as frentes. -->
<Story name="Default" args={{ data: { summary, tickets }, state: settled, actions }} />

<!-- A MESMA tela em 400px: os cartões empilham (skill `ui-standards`). -->
<Story
  name="Mobile"
  parameters={{ viewport: { defaultViewport: 'mobile1' } }}
  args={{ data: { summary, tickets }, state: settled, actions }}
/>

<!-- Tudo em dia: nenhum cartão acende, e o painel diz isso sem alarme. -->
<Story
  name="AllClear"
  args={{
    data: {
      summary: {
        inventory: { products: 14, outOfStock: 0 },
        quotes: { pending: 0, pendingAmountCents: 0, approvedAmountCents: 124000 },
        disposals: { units: 0 },
        recentMovements: summary.recentMovements,
      },
      tickets: { open: 0, inProgress: 0, waiting: 0 },
    },
    state: settled,
    actions,
  }}
/>

<!-- Carregando: esqueleto no lugar do número, nunca um zero de mentira. -->
<Story
  name="Loading"
  args={{
    data: { summary: null, tickets: null },
    state: { isLoading: true, isTicketsLoading: true, error: null },
    actions,
  }}
/>

<!-- Sistema novo: nada cadastrado e nenhum movimento ainda. -->
<Story
  name="Empty"
  args={{
    data: {
      summary: {
        inventory: { products: 0, outOfStock: 0 },
        quotes: { pending: 0, pendingAmountCents: 0, approvedAmountCents: 0 },
        disposals: { units: 0 },
        recentMovements: [],
      },
      tickets: { open: 0, inProgress: 0, waiting: 0 },
    },
    state: settled,
    actions,
  }}
/>

<!-- Os chamados falharam: o cartão fica com traço, e o resto do painel continua. -->
<Story name="WithoutTickets" args={{ data: { summary, tickets: null }, state: settled, actions }} />

<!-- Falha do resumo: o motivo na tela, com o caminho de volta. -->
<Story
  name="WithError"
  args={{
    data: { summary: null, tickets },
    state: { ...settled, error: 'Não consegui falar com o servidor.' },
    actions,
  }}
/>

<!-- Caso limite: valores altos e nome de produto comprido. -->
<Story
  name="LongText (edge case)"
  args={{
    data: {
      summary: {
        inventory: { products: 1840, outOfStock: 312 },
        quotes: { pending: 128, pendingAmountCents: 987654321, approvedAmountCents: 123456789 },
        disposals: { units: 1 },
        recentMovements: [
          movement({
            itemName: 'Suporte articulado de parede para monitor de até 32 polegadas com inclinação',
            itemUnit: 'unit',
            quantity: 1250,
          }),
        ],
      },
      tickets: { open: 240, inProgress: 85, waiting: 37 },
    },
    state: settled,
    actions,
  }}
/>
