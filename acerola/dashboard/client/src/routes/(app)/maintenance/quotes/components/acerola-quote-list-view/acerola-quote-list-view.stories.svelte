<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type MaintenanceQuote } from '@template/shared/schemas/maintenance-quote.schema';
  import { fn } from 'storybook/test';

  import QuoteListView, { type QuoteListFilterValues } from './acerola-quote-list-view.svelte';

  function quote(overrides: Partial<MaintenanceQuote> = {}): MaintenanceQuote {
    return {
      id: 1,
      supplier: 'Clima Norte Refrigeração',
      description: 'Limpeza e recarga de gás dos três aparelhos de ar-condicionado',
      kind: 'service',
      amountCents: 96000,
      quotedOn: '2026-10-02',
      status: 'pending',
      note: 'Inclui a troca do filtro da sala da diretoria.',
      attachmentUrl: '#',
      attachmentName: 'orcamento-clima-norte.pdf',
      createdAt: '2026-10-02T12:00:00.000Z',
      createdBy: 'manutencao@azuos.local',
      updatedAt: null,
      updatedBy: null,
      ...overrides,
    };
  }

  const quotes: MaintenanceQuote[] = [
    quote(),
    quote({
      id: 2,
      supplier: 'Móveis Planalto',
      description: 'Seis cadeiras giratórias com apoio de braço',
      kind: 'product',
      amountCents: 354000,
      note: null,
      attachmentUrl: null,
      attachmentName: null,
    }),
    quote({
      id: 3,
      supplier: 'Dedetiza Cerrado',
      description: 'Dedetização e desratização do escritório inteiro',
      amountCents: 68000,
      quotedOn: '2026-09-13',
      status: 'approved',
      note: 'Serviço feito num sábado.',
    }),
    quote({
      id: 4,
      supplier: 'Persianas Horizonte',
      description: 'Persianas verticais para a sala de reunião',
      kind: 'product',
      amountCents: 289000,
      quotedOn: '2026-08-26',
      status: 'rejected',
      note: 'Ficou para depois da reforma da sala.',
      attachmentUrl: null,
      attachmentName: null,
    }),
  ];

  const total = quotes.reduce((sum, entry) => sum + entry.amountCents, 0);

  const emptyFilter: QuoteListFilterValues = { search: '', status: '', kind: '' };

  const settled = {
    isLoading: false,
    isEmpty: false,
    isFilteredOut: false,
    isTruncated: false,
    error: null,
  };

  const actions = {
    onSearchChange: fn(),
    onStatusChange: fn(),
    onKindChange: fn(),
    onClearFilters: fn(),
    onRetry: fn(),
    onRegister: fn(),
    onEdit: fn(),
    onAskDelete: fn(),
    onCancelDelete: fn(),
    onConfirmDelete: fn(),
  };

  const { Story } = defineMeta({
    title: 'Features/Quotes/AcerolaQuoteListView',
    component: QuoteListView,
  });
</script>

<!-- O uso mais comum: as três situações, com e sem documento. -->
<Story
  name="Default"
  args={{
    data: { quotes, total: quotes.length, amountCents: total, filter: emptyFilter, deleting: null },
    state: settled,
    actions,
  }}
/>

<!-- A MESMA tela em 400px (skill `ui-standards`). -->
<Story
  name="Mobile"
  parameters={{ viewport: { defaultViewport: 'mobile1' } }}
  args={{
    data: { quotes, total: quotes.length, amountCents: total, filter: emptyFilter, deleting: null },
    state: settled,
    actions,
  }}
/>

<!-- Carregando: ninguém diz "nenhum orçamento" antes de a consulta terminar. -->
<Story
  name="Loading"
  args={{
    data: { quotes: [], total: 0, amountCents: 0, filter: emptyFilter, deleting: null },
    state: { ...settled, isLoading: true },
    actions,
  }}
/>

<!-- Sistema novo: vazio de verdade, com o primeiro passo à mão. -->
<Story
  name="Empty"
  args={{
    data: { quotes: [], total: 0, amountCents: 0, filter: emptyFilter, deleting: null },
    state: { ...settled, isEmpty: true },
    actions,
  }}
/>

<!-- Vazio POR CAUSA DO FILTRO: outra frase e outra saída. -->
<Story
  name="FilteredOut"
  args={{
    data: {
      quotes: [],
      total: 0,
      amountCents: 0,
      filter: { ...emptyFilter, status: 'rejected' },
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
    data: { quotes: [], total: 0, amountCents: 0, filter: emptyFilter, deleting: null },
    state: { ...settled, error: 'Não consegui falar com o servidor.' },
    actions,
  }}
/>

<!-- Confirmação de exclusão, com a empresa na frase. -->
<Story
  name="Deleting"
  args={{
    data: {
      quotes,
      total: quotes.length,
      amountCents: total,
      filter: emptyFilter,
      deleting: quote(),
    },
    state: { ...settled, isDeleting: true },
    actions,
  }}
/>

<!-- Caso limite: empresa e descrição compridas, valor alto e valor zero. -->
<Story
  name="LongText (edge case)"
  args={{
    data: {
      quotes: [
        quote({
          supplier: 'Construtora e Reformas Vale do Rio Vermelho Engenharia e Acabamentos',
          description:
            'Reforma completa da sala de reunião: remoção do forro antigo, forro novo em gesso acartonado, pintura das quatro paredes, troca do piso por vinílico, instalação de seis pontos de tomada e passagem de cabo de rede para a mesa.',
          kind: 'other',
          amountCents: 4875000,
          attachmentName:
            'proposta-comercial-reforma-sala-de-reuniao-versao-final-revisada-assinada-2026.pdf',
        }),
        quote({
          id: 2,
          supplier: 'Hidráulica Boa Água',
          description: 'Visita para avaliar o vazamento do banheiro do térreo',
          amountCents: 0,
          status: 'approved',
          note: null,
          attachmentUrl: null,
          attachmentName: null,
        }),
      ],
      total: 2,
      amountCents: 4875000,
      filter: emptyFilter,
      deleting: null,
    },
    state: { ...settled, isTruncated: true },
    actions,
  }}
/>
