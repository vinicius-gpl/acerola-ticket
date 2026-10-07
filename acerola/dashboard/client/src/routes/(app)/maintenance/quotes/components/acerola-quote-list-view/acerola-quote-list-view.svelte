<script lang="ts" module>
  import {
    formatCents,
    quoteKindLabel,
    quoteKindOptions,
    quoteStatusLabel,
    quoteStatusOptions,
    quoteStatusTone,
    type QuoteKind,
    type QuoteStatus,
  } from '@template/shared/domain/maintenance-quote.util';
  import { type MaintenanceQuote } from '@template/shared/schemas/maintenance-quote.schema';

  /**
   * OS ORÇAMENTOS DA MANUTENÇÃO: o que foi cotado com empresas de fora, guardado num lugar só.
   *
   * Não é uma sugestão de valores: é a gaveta dos orçamentos que já existem — o conserto, o
   * móvel, o serviço — com o documento que a empresa mandou e o que foi decidido.
   *
   * Cartão em lista, e não tabela: a descrição do que foi orçado é uma frase, e frase em
   * coluna de tabela vira três linhas espremidas ou um texto cortado.
   *
   * Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando,
   * vazia, filtrada sem resultado e em erro.
   */
  export type QuoteListFilterValues = {
    search: string;
    status: QuoteStatus | '';
    kind: QuoteKind | '';
  };

  export type AcerolaQuoteListViewProps = {
    data: {
      quotes: MaintenanceQuote[];
      total: number;
      amountCents: number;
      filter: QuoteListFilterValues;
      /** O orçamento esperando confirmação de exclusão — nulo quando não há. */
      deleting: MaintenanceQuote | null;
    };
    state: {
      isLoading: boolean;
      isRefetching?: boolean;
      isEmpty: boolean;
      isFilteredOut: boolean;
      isTruncated: boolean;
      isDeleting?: boolean;
      error: string | null;
      deleteError?: string | null;
    };
    actions: {
      onSearchChange: (search: string) => void;
      onStatusChange: (status: QuoteStatus | '') => void;
      onKindChange: (kind: QuoteKind | '') => void;
      onClearFilters: () => void;
      onRetry: () => void;
      onRegister: () => void;
      onEdit: (quote: MaintenanceQuote) => void;
      onAskDelete: (quote: MaintenanceQuote) => void;
      onCancelDelete: () => void;
      onConfirmDelete: () => void;
    };
  };

  const STATUS_FILTER_OPTIONS = quoteStatusOptions();
  const KIND_FILTER_OPTIONS = quoteKindOptions();
</script>

<script lang="ts">
  import FileText from '@lucide/svelte/icons/file-text';
  import Paperclip from '@lucide/svelte/icons/paperclip';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Plus from '@lucide/svelte/icons/plus';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import ConfirmDialog from '$lib/components/acerola-confirm-dialog/acerola-confirm-dialog.svelte';
  import EmptyState from '$lib/components/acerola-empty-state/acerola-empty-state.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import FilterField from '$lib/components/acerola-filter-field/acerola-filter-field.svelte';
  import OptionPicker from '$lib/components/acerola-option-picker/acerola-option-picker.svelte';
  import PageHeader from '$lib/components/acerola-page-header/acerola-page-header.svelte';
  import StatusBadge from '$lib/components/acerola-status-badge/acerola-status-badge.svelte';
  import TextField from '$lib/components/acerola-text-field/acerola-text-field.svelte';
  import { formatDay } from '$lib/utils/format-date';

  let { data, state: listState, actions }: AcerolaQuoteListViewProps = $props();

  const hasActiveFilter = $derived(
    data.filter.search.trim() !== '' || data.filter.status !== '' || data.filter.kind !== '',
  );

  /* "3 orçamentos · R$ 7.680,00": quantos são e quanto somam os que estão à vista. */
  const summary = $derived(
    `${data.total} ${data.total === 1 ? 'orçamento' : 'orçamentos'} · ${formatCents(data.amountCents)}`,
  );
</script>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-5">
  <PageHeader
    data={{
      title: 'Orçamentos',
      description: 'O que foi cotado com empresas de fora: produtos, serviços e o resto.',
    }}
  >
    <ActionButton
      data={{ label: 'Guardar orçamento' }}
      ui={{ icon: Plus }}
      actions={{ onClick: actions.onRegister }}
    />
  </PageHeader>

  <div class="rounded-surface border-border bg-card flex flex-col gap-3 border p-4 shadow-xs">
    <TextField
      data={{
        label: 'Buscar',
        name: 'search',
        value: data.filter.search,
        placeholder: 'Empresa ou o que foi orçado',
      }}
      actions={{ onChange: actions.onSearchChange }}
    />

    <div class="flex flex-wrap items-end gap-x-4 gap-y-3">
      <FilterField data={{ label: 'Situação' }}>
        <OptionPicker
          data={{ value: data.filter.status, options: STATUS_FILTER_OPTIONS }}
          ui={{ ariaLabel: 'Filtrar por situação', allLabel: 'Todas' }}
          actions={{
            onChange: (value: string) => actions.onStatusChange(value as QuoteStatus | ''),
          }}
        />
      </FilterField>

      <FilterField data={{ label: 'Tipo' }}>
        <OptionPicker
          data={{ value: data.filter.kind, options: KIND_FILTER_OPTIONS }}
          ui={{ ariaLabel: 'Filtrar por tipo', allLabel: 'Todos' }}
          actions={{ onChange: (value: string) => actions.onKindChange(value as QuoteKind | '') }}
        />
      </FilterField>

      {#if hasActiveFilter}
        <ActionButton
          data={{ label: 'Limpar filtros' }}
          ui={{ variant: 'ghost', size: 'lg' }}
          actions={{ onClick: actions.onClearFilters }}
        />
      {/if}
    </div>
  </div>

  <!-- Os estados vêm PRIMEIRO, e cada um encerra a leitura (CONTRIBUTING §2). -->
  {#if listState.error}
    <ErrorState
      data={{ message: listState.error, title: 'Não consegui carregar os orçamentos' }}
      state={{ isRetrying: listState.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if listState.isLoading}
    <p class="text-muted-foreground p-6 text-center text-sm">Carregando os orçamentos…</p>
  {:else if listState.isEmpty}
    <EmptyState
      data={{
        title: 'Nenhum orçamento guardado ainda',
        description: 'Quando uma empresa mandar um orçamento, guarde aqui com o documento.',
      }}
      ui={{ icon: FileText }}
    >
      <ActionButton
        data={{ label: 'Guardar orçamento' }}
        ui={{ icon: Plus }}
        actions={{ onClick: actions.onRegister }}
      />
    </EmptyState>
  {:else if listState.isFilteredOut}
    <EmptyState
      data={{
        title: 'Nenhum orçamento com esse filtro',
        description: 'Tente outra situação, ou limpe o filtro para ver todos.',
      }}
      ui={{ icon: FileText }}
    >
      <ActionButton
        data={{ label: 'Limpar filtros' }}
        ui={{ variant: 'secondary' }}
        actions={{ onClick: actions.onClearFilters }}
      />
    </EmptyState>
  {:else}
    <section class="flex flex-col gap-3">
      <p class="text-muted-foreground text-xs">{summary}</p>

      <ul class="flex flex-col gap-3">
        {#each data.quotes as quote (quote.id)}
          <li class="rounded-surface border-border bg-card flex flex-col gap-2.5 border p-4 shadow-xs">
            <div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
              <div class="min-w-0">
                <h3 class="text-ink-900 text-sm leading-tight font-semibold">{quote.supplier}</h3>
                <p class="text-ink-500 mt-1 text-xs">
                  {quoteKindLabel(quote.kind)} · {formatDay(quote.quotedOn)}
                </p>
              </div>

              <div class="flex shrink-0 items-center gap-2">
                <span class="text-ink-900 text-base font-semibold tabular-nums">
                  {formatCents(quote.amountCents)}
                </span>
                <StatusBadge
                  data={{ label: quoteStatusLabel(quote.status) }}
                  ui={{ tone: quoteStatusTone(quote.status), size: 'sm' }}
                />
              </div>
            </div>

            <p class="text-ink-700 text-sm">{quote.description}</p>

            {#if quote.note}
              <p class="text-ink-500 text-xs">{quote.note}</p>
            {/if}

            <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
              <!-- O documento abre em outra aba: quem está conferindo o orçamento quer o PDF
                   ao lado da lista, não no lugar dela. -->
              {#if quote.attachmentUrl}
                <a
                  href={quote.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary inline-flex min-w-0 items-center gap-1.5 text-xs font-medium underline-offset-4 hover:underline"
                >
                  <Paperclip class="size-3.5 shrink-0" aria-hidden="true" />
                  <span class="truncate">{quote.attachmentName ?? 'Abrir documento'}</span>
                </a>
              {:else}
                <span class="text-muted-foreground text-xs">Sem documento</span>
              {/if}

              <div class="flex items-center gap-1">
                <ActionButton
                  data={{ label: 'Corrigir' }}
                  ui={{ variant: 'ghost', size: 'sm', icon: Pencil, isIconOnly: true }}
                  actions={{ onClick: () => actions.onEdit(quote) }}
                />
                <ActionButton
                  data={{ label: 'Excluir' }}
                  ui={{ variant: 'ghost', size: 'sm', icon: Trash2, isIconOnly: true }}
                  actions={{ onClick: () => actions.onAskDelete(quote) }}
                />
              </div>
            </div>
          </li>
        {/each}
      </ul>

      {#if listState.isTruncated}
        <p class="text-muted-foreground text-xs">
          A lista mostra os orçamentos mais recentes. Use a busca para achar o que falta.
        </p>
      {/if}
    </section>
  {/if}
</div>

<!-- Excluir é irreversível: pergunta antes, com a empresa na frase. -->
<ConfirmDialog
  data={{
    title: 'Excluir orçamento',
    description: data.deleting
      ? `O orçamento de "${data.deleting.supplier}" sai da lista. O documento dele também é apagado.`
      : '',
    confirmLabel: 'Excluir',
    confirmingLabel: 'Excluindo…',
  }}
  ui={{ tone: 'danger' }}
  state={{
    isOpen: data.deleting !== null,
    isConfirming: listState.isDeleting,
    error: listState.deleteError,
  }}
  actions={{ onConfirm: actions.onConfirmDelete, onCancel: actions.onCancelDelete }}
/>
