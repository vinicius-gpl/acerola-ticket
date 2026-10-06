<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type InventoryMovement } from '@template/shared/schemas/inventory-movement.schema';
  import { fn } from 'storybook/test';

  import InventoryDisposalListView from './acerola-inventory-disposal-list-view.svelte';

  function disposal(overrides: Partial<InventoryMovement> = {}): InventoryMovement {
    return {
      id: 1,
      itemId: 1,
      itemName: 'Cadeira giratória com apoio de braço',
      itemUnit: 'unit',
      type: 'disposal',
      quantity: 1,
      balanceAfter: 5,
      reason: 'broken',
      note: 'Base rachou; sem conserto.',
      createdAt: '2026-09-15T12:00:00.000Z',
      createdBy: 'manutencao@azuos.local',
      ...overrides,
    };
  }

  const disposals: InventoryMovement[] = [
    disposal(),
    disposal({
      id: 2,
      itemName: 'Café torrado e moído 500 g',
      itemUnit: 'package',
      quantity: 2,
      balanceAfter: 3,
      reason: 'expired',
      note: 'Pacotes vencidos achados no fundo do armário da copa.',
    }),
    disposal({
      id: 3,
      itemName: 'Lâmpada LED 9 W bivolt',
      itemUnit: 'box',
      balanceAfter: 2,
      reason: 'lost',
      note: null,
    }),
  ];

  const noFilter = { reason: '' as const };

  const settled = {
    isLoading: false,
    isEmpty: false,
    isFilteredOut: false,
    isTruncated: false,
    error: null,
  };

  const actions = {
    onReasonChange: fn(),
    onClearFilters: fn(),
    onRetry: fn(),
    onRegister: fn(),
  };

  const { Story } = defineMeta({
    title: 'Features/Disposal/AcerolaInventoryDisposalListView',
    component: InventoryDisposalListView,
  });
</script>

<!-- O uso mais comum: descartes por motivos diferentes, com e sem observação. -->
<Story
  name="Default"
  args={{
    data: { disposals, total: 3, units: 4, filter: noFilter },
    state: settled,
    actions,
  }}
/>

<!-- A MESMA tela em 400px (skill `ui-standards`). -->
<Story
  name="Mobile"
  parameters={{ viewport: { defaultViewport: 'mobile1' } }}
  args={{
    data: { disposals, total: 3, units: 4, filter: noFilter },
    state: settled,
    actions,
  }}
/>

<!-- Carregando: ninguém diz "nenhum descarte" antes de a consulta terminar. -->
<Story
  name="Loading"
  args={{
    data: { disposals: [], total: 0, units: 0, filter: noFilter },
    state: { ...settled, isLoading: true },
    actions,
  }}
/>

<!-- Nada foi descartado ainda: vazio de verdade, com o primeiro passo à mão. -->
<Story
  name="Empty"
  args={{
    data: { disposals: [], total: 0, units: 0, filter: noFilter },
    state: { ...settled, isEmpty: true },
    actions,
  }}
/>

<!-- Vazio POR CAUSA DO FILTRO: outra frase e outra saída. -->
<Story
  name="FilteredOut"
  args={{
    data: { disposals: [], total: 0, units: 0, filter: { reason: 'obsolete' } },
    state: { ...settled, isFilteredOut: true },
    actions,
  }}
/>

<!-- Falha: o motivo na tela, com o caminho de volta. -->
<Story
  name="WithError"
  args={{
    data: { disposals: [], total: 0, units: 0, filter: noFilter },
    state: { ...settled, error: 'Não consegui falar com o servidor.' },
    actions,
  }}
/>

<!-- Caso limite: nome e observação compridos, e uma quantidade grande. -->
<Story
  name="LongText (edge case)"
  args={{
    data: {
      disposals: [
        disposal({
          itemName: 'Suporte articulado de parede para monitor de até 32 polegadas com inclinação',
          quantity: 120,
          reason: 'obsolete',
          note: 'Comprados para a sala de reunião antiga e nunca instalados. A sala foi reformada com monitores maiores, que não cabem neste suporte; doados para a escola do bairro.',
        }),
      ],
      total: 1,
      units: 120,
      filter: noFilter,
    },
    state: { ...settled, isTruncated: true },
    actions,
  }}
/>
