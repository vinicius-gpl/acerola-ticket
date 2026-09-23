<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type Part } from '@template/shared/schemas/part.schema';

  import PartListView, { type PartListFilter, type PartSummary } from './part-list-view.svelte';

  function part(over: Partial<Part> = {}): Part {
    return {
      id: 1,
      name: 'SSD 240 GB Kingston',
      category: 'ssd',
      condition: 'new',
      balance: 3,
      createdAt: '2026-09-01T12:00:00.000Z',
      createdBy: 'suporte@azuos.local',
      updatedAt: null,
      updatedBy: null,
      ...over,
    };
  }

  const parts: Part[] = [
    part(),
    /* Mesma descrição, condição diferente: duas linhas de propósito. */
    part({ id: 2, condition: 'used', balance: 2 }),
    part({ id: 3, name: 'Memória DDR4 8 GB 2666 MHz', category: 'memory', balance: 4 }),
    part({ id: 5, name: 'Teclado USB ABNT2', category: 'keyboard', balance: 6 }),
    /* CASO LIMITE: prateleira vazia — a peça continua na lista, com o saldo em vermelho. */
    part({
      id: 7,
      name: 'Fone com microfone para atendimento',
      category: 'headset',
      balance: 0,
    }),
    /* CASO LIMITE DE LAYOUT: descrição comprida, que precisa quebrar linha. */
    part({
      id: 8,
      name: 'Adaptador DisplayPort para VGA com cabo de 1,8 m (para os monitores antigos da recepção)',
      category: 'adapter_dp_vga',
      balance: 2,
    }),
  ];

  const summary: PartSummary = { kinds: 8, items: 23, outOfStock: 1 };

  const emptyFilter: PartListFilter = {
    search: '',
    category: '',
    condition: '',
    inStockOnly: false,
  };

  const actions = {
    onSearchChange: () => {},
    onCategoryChange: () => {},
    onConditionChange: () => {},
    onInStockOnlyChange: () => {},
    onClearFilters: () => {},
    onRetry: () => {},
    onRegister: () => {},
    onEdit: () => {},
    onMove: () => {},
    onOpenLedger: () => {},
  };

  const settled = {
    isLoading: false,
    isEmpty: false,
    isFilteredOut: false,
    isTruncated: false,
    error: null,
  };

  const { Story } = defineMeta({
    title: 'Components/PartListView',
    component: PartListView,
  });
</script>

<Story
  name="Default"
  args={{
    data: { parts, total: parts.length, summary, filter: emptyFilter },
    state: settled,
    actions,
  }}
/>

<Story
  name="Loading"
  args={{
    data: { parts: [], total: 0, summary: null, filter: emptyFilter },
    state: { ...settled, isLoading: true, isSummaryLoading: true },
    actions,
  }}
/>

<!-- Nenhuma peça ainda: o próximo passo é cadastrar a primeira. -->
<Story
  name="Empty"
  args={{
    data: {
      parts: [],
      total: 0,
      summary: { kinds: 0, items: 0, outOfStock: 0 },
      filter: emptyFilter,
    },
    state: { ...settled, isEmpty: true },
    actions,
  }}
/>

<!-- Filtro escondeu tudo: o próximo passo é outro. -->
<Story
  name="Filtered out"
  args={{
    data: {
      parts: [],
      total: 0,
      summary,
      filter: { ...emptyFilter, search: 'placa de vídeo', inStockOnly: true },
    },
    state: { ...settled, isFilteredOut: true },
    actions,
  }}
/>

<Story
  name="Error"
  args={{
    data: { parts: [], total: 0, summary: null, filter: emptyFilter },
    state: { ...settled, error: 'Não consegui falar com o servidor. Confira se ele está rodando.' },
    actions,
  }}
/>

<!-- Só peças zeradas: a lista de compras, na prática. -->
<Story
  name="Out of stock"
  args={{
    data: {
      parts: [part({ balance: 0 }), part({ id: 7, name: 'Fone com microfone', balance: 0 })],
      total: 2,
      summary: { kinds: 8, items: 0, outOfStock: 2 },
      filter: emptyFilter,
    },
    state: settled,
    actions,
  }}
/>

<Story
  name="Truncated"
  args={{
    data: { parts, total: 240, summary, filter: emptyFilter },
    state: { ...settled, isTruncated: true },
    actions,
  }}
/>
