<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type InventoryItem } from '@template/shared/schemas/inventory-item.schema';
  import { fn } from 'storybook/test';

  import StockListView, { type StockListFilterValues } from './acerola-stock-list-view.svelte';

  function item(overrides: Partial<InventoryItem> = {}): InventoryItem {
    return {
      id: 1,
      name: 'Café torrado e moído 500 g',
      category: 'pantry',
      unit: 'package',
      location: 'Copa',
      code: null,
      note: null,
      photoUrl: null,
      balance: 7,
      createdAt: '2026-09-01T12:00:00.000Z',
      createdBy: 'manutencao@azuos.local',
      updatedAt: null,
      updatedBy: null,
      ...overrides,
    };
  }

  const items: InventoryItem[] = [
    item(),
    item({ id: 2, name: 'Açúcar refinado', unit: 'kilogram', balance: 0 }),
    item({
      id: 3,
      name: 'Desinfetante concentrado',
      category: 'cleaning',
      unit: 'liter',
      location: 'Depósito de limpeza',
      balance: 12,
    }),
    item({
      id: 4,
      name: 'Cadeira giratória com apoio de braço',
      category: 'furniture',
      unit: 'unit',
      location: 'Sala da contabilidade',
      balance: 5,
    }),
  ];

  const emptyFilter: StockListFilterValues = { search: '', category: '', outOfStockOnly: false };

  const settled = {
    isLoading: false,
    isEmpty: false,
    isFilteredOut: false,
    isTruncated: false,
    error: null,
  };

  const actions = {
    onSearchChange: fn(),
    onCategoryChange: fn(),
    onOutOfStockOnlyChange: fn(),
    onClearFilters: fn(),
    onRetry: fn(),
    onEntry: fn(),
    onExit: fn(),
    onOpenInventory: fn(),
  };

  const { Story } = defineMeta({
    title: 'Features/Stock/AcerolaStockListView',
    component: StockListView,
  });
</script>

<!-- O uso mais comum: produtos com estoque e um zerado. -->
<Story
  name="Default"
  args={{
    data: { items, total: items.length, outOfStock: 1, filter: emptyFilter },
    state: settled,
    actions,
  }}
/>

<!-- A MESMA tela em 400px: a grade vira uma coluna só (skill `ui-standards`). -->
<Story
  name="Mobile"
  parameters={{ viewport: { defaultViewport: 'mobile1' } }}
  args={{
    data: { items, total: items.length, outOfStock: 1, filter: emptyFilter },
    state: settled,
    actions,
  }}
/>

<!-- A lista de compras: só o que zerou. -->
<Story
  name="OutOfStockOnly"
  args={{
    data: {
      items: items.filter((entry) => entry.balance === 0),
      total: 1,
      outOfStock: 1,
      filter: { ...emptyFilter, outOfStockOnly: true },
    },
    state: settled,
    actions,
  }}
/>

<!-- Carregando: ninguém diz "nenhum produto" antes de a consulta terminar. -->
<Story
  name="Loading"
  args={{
    data: { items: [], total: 0, outOfStock: 0, filter: emptyFilter },
    state: { ...settled, isLoading: true },
    actions,
  }}
/>

<!-- Sistema novo: o depósito não tem o que contar, e aponta para o inventário. -->
<Story
  name="Empty"
  args={{
    data: { items: [], total: 0, outOfStock: 0, filter: emptyFilter },
    state: { ...settled, isEmpty: true },
    actions,
  }}
/>

<!-- Vazio POR CAUSA DO FILTRO: outra frase e outra saída. -->
<Story
  name="FilteredOut"
  args={{
    data: {
      items: [],
      total: 0,
      outOfStock: 0,
      filter: { ...emptyFilter, category: 'utility' },
    },
    state: { ...settled, isFilteredOut: true },
    actions,
  }}
/>

<!-- Falha: o motivo na tela, com o caminho de volta. -->
<Story
  name="WithError"
  args={{
    data: { items: [], total: 0, outOfStock: 0, filter: emptyFilter },
    state: { ...settled, error: 'Não consegui falar com o servidor.' },
    actions,
  }}
/>

<!-- Caso limite: nome comprido, sem lugar e um saldo de quatro dígitos. -->
<Story
  name="LongText (edge case)"
  args={{
    data: {
      items: [
        item({
          name: 'Suporte articulado de parede para monitor de até 32 polegadas com inclinação',
          category: 'other',
          unit: 'unit',
          location: null,
          balance: 1250,
        }),
      ],
      total: 1,
      outOfStock: 0,
      filter: emptyFilter,
    },
    state: { ...settled, isTruncated: true },
    actions,
  }}
/>
