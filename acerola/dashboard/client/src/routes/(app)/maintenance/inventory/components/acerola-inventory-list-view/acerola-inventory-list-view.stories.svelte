<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type InventoryItem } from '@template/shared/schemas/inventory-item.schema';
  import { fn } from 'storybook/test';

  import InventoryListView, {
    type InventoryListFilterValues,
  } from './acerola-inventory-list-view.svelte';

  /* Um quadradinho em SVG: a história não depende de arquivo nem de rede. */
  const PHOTO =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect width="160" height="120" fill="%23cbd5e1"/></svg>',
    );

  function item(overrides: Partial<InventoryItem> = {}): InventoryItem {
    return {
      id: 1,
      name: 'Cadeira giratória com apoio de braço',
      category: 'furniture',
      unit: 'unit',
      location: 'Sala da contabilidade',
      code: 'PAT-0101',
      note: null,
      photoUrl: PHOTO,
      balance: 3,
      createdAt: '2026-09-01T12:00:00.000Z',
      createdBy: 'manutencao@azuos.local',
      updatedAt: null,
      updatedBy: null,
      ...overrides,
    };
  }

  const items: InventoryItem[] = [
    item(),
    item({
      id: 2,
      name: 'Café torrado e moído 500 g',
      category: 'pantry',
      unit: 'package',
      location: 'Copa',
      code: null,
      note: 'Marca que o pessoal prefere; comprar dois pacotes por vez.',
    }),
    item({
      id: 3,
      name: 'Desinfetante concentrado',
      category: 'cleaning',
      unit: 'liter',
      location: 'Depósito de limpeza',
      code: null,
      photoUrl: null,
    }),
    item({
      id: 4,
      name: 'Bebedouro de coluna',
      category: 'appliance',
      unit: 'unit',
      location: 'Copa',
      code: 'PAT-0201',
    }),
  ];

  const emptyFilter: InventoryListFilterValues = {
    search: '',
    category: '',
    withoutPhotoOnly: false,
  };

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
    onWithoutPhotoOnlyChange: fn(),
    onClearFilters: fn(),
    onRetry: fn(),
    onRegister: fn(),
    onEdit: fn(),
    onAskDelete: fn(),
    onCancelDelete: fn(),
    onConfirmDelete: fn(),
  };

  const { Story } = defineMeta({
    title: 'Features/Inventory/AcerolaInventoryListView',
    component: InventoryListView,
  });
</script>

<!-- O uso mais comum: a grade cheia, com e sem foto. -->
<Story
  name="Default"
  args={{
    data: { items, total: items.length, filter: emptyFilter, deleting: null },
    state: settled,
    actions,
  }}
/>

<!-- A MESMA tela em 400px: a grade vira uma coluna só (skill `ui-standards`). -->
<Story
  name="Mobile"
  parameters={{ viewport: { defaultViewport: 'mobile1' } }}
  args={{
    data: { items, total: items.length, filter: emptyFilter, deleting: null },
    state: settled,
    actions,
  }}
/>

<!-- Carregando: ninguém diz "nenhum produto" antes de a consulta terminar. -->
<Story
  name="Loading"
  args={{
    data: { items: [], total: 0, filter: emptyFilter, deleting: null },
    state: { ...settled, isLoading: true },
    actions,
  }}
/>

<!-- Sistema novo: vazio de verdade, com o primeiro passo à mão. -->
<Story
  name="Empty"
  args={{
    data: { items: [], total: 0, filter: emptyFilter, deleting: null },
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
      filter: { ...emptyFilter, category: 'utility' },
      deleting: null,
    },
    state: { ...settled, isFilteredOut: true },
    actions,
  }}
/>

<!-- Falha: o motivo na tela, com o caminho de volta. -->
<Story
  name="WithError"
  args={{
    data: { items: [], total: 0, filter: emptyFilter, deleting: null },
    state: { ...settled, error: 'Não consegui falar com o servidor.' },
    actions,
  }}
/>

<!-- Confirmação de exclusão, com o nome do produto na frase. -->
<Story
  name="Deleting"
  args={{
    data: { items, total: items.length, filter: emptyFilter, deleting: item() },
    state: { ...settled, isDeleting: true },
    actions,
  }}
/>

<!-- Caso limite: nome e observação compridos não podem estourar o cartão. -->
<Story
  name="LongText (edge case)"
  args={{
    data: {
      items: [
        item({
          name: 'Suporte articulado de parede para monitor de até 32 polegadas com inclinação',
          note: 'Comprado para a sala de reunião e nunca instalado. Está encostado atrás do armário do arquivo, ainda na caixa, esperando a decisão sobre a reforma da sala.',
          location: null,
          photoUrl: null,
        }),
      ],
      total: 1,
      filter: emptyFilter,
      deleting: null,
    },
    state: settled,
    actions,
  }}
/>
