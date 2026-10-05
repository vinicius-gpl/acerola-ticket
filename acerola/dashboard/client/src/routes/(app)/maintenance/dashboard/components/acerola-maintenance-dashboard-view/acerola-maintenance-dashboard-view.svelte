<script lang="ts" module>
  import { inventoryUnitShortLabel } from '@template/shared/domain/inventory-catalog.util';
  import {
    stockMovementTypeLabel,
    type StockMovementType,
  } from '@template/shared/domain/inventory-stock.util';
  import { formatCents } from '@template/shared/domain/maintenance-quote.util';
  import { type MaintenanceDashboard } from '@template/shared/schemas/maintenance-dashboard.schema';

  import { type StatusBadgeTone } from '$lib/components/acerola-status-badge/acerola-status-badge.svelte';

  /**
   * O PAINEL DA MANUTENÇÃO: o que ela precisa ver ao abrir o sistema.
   *
   * Quatro números que respondem "tem alguma coisa esperando por mim?" — chamado aberto,
   * produto zerado, orçamento sem decisão e o que foi descartado no mês — e, embaixo, o que
   * explica dois deles: o dinheiro dos orçamentos e os últimos movimentos do depósito.
   *
   * Os cartões NÃO são clicáveis: o atalho de cada um é o botão logo abaixo, com o nome da
   * tela. Um cartão que navega sem dizer para onde é uma surpresa; um botão escrito "Abrir o
   * depósito" não é.
   *
   * Função pura de props: não busca nada e não navega.
   */
  export type AcerolaMaintenanceDashboardViewProps = {
    data: {
      summary: MaintenanceDashboard | null;
      tickets: { open: number; inProgress: number; waiting: number } | null;
    };
    state: {
      isLoading: boolean;
      isRefetching?: boolean;
      isTicketsLoading?: boolean;
      error: string | null;
    };
    actions: {
      onRetry: () => void;
      onOpenTickets: () => void;
      onOpenStock: () => void;
      onOpenQuotes: () => void;
      onOpenDisposal: () => void;
    };
  };

  /** Entrada é boa notícia, saída é rotina, descarte é perda. */
  const MOVEMENT_TONE: Record<StockMovementType, StatusBadgeTone> = {
    in: 'success',
    out: 'warning',
    disposal: 'danger',
  };
</script>

<script lang="ts">
  import FileText from '@lucide/svelte/icons/file-text';
  import LifeBuoy from '@lucide/svelte/icons/life-buoy';
  import PackageX from '@lucide/svelte/icons/package-x';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import PageHeader from '$lib/components/acerola-page-header/acerola-page-header.svelte';
  import PanelCard from '$lib/components/acerola-panel-card/acerola-panel-card.svelte';
  import StatCard from '$lib/components/acerola-stat-card/acerola-stat-card.svelte';
  import StatCardGrid from '$lib/components/acerola-stat-card-grid/acerola-stat-card-grid.svelte';
  import StatusBadge from '$lib/components/acerola-status-badge/acerola-status-badge.svelte';
  import { formatDate } from '$lib/utils/format-date';

  let { data, state: viewState, actions }: AcerolaMaintenanceDashboardViewProps = $props();

  const summary = $derived(data.summary);

  /* "2 em andamento · 1 aguardando": o que já tem dono, ao lado do que ainda não tem. */
  const ticketsHint = $derived(
    data.tickets
      ? `${data.tickets.inProgress} em andamento · ${data.tickets.waiting} aguardando`
      : null,
  );
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-5">
  <PageHeader
    data={{
      title: 'Painel',
      description: 'O que está esperando pela Manutenção: chamados, depósito e orçamentos.',
    }}
  />

  <!-- A falha encerra a leitura (CONTRIBUTING §2): sem o resumo não há número para mostrar,
       e uma fileira de zeros faria parecer que está tudo em dia. -->
  {#if viewState.error}
    <ErrorState
      data={{ message: viewState.error, title: 'Não consegui carregar o painel' }}
      state={{ isRetrying: viewState.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else}
    <StatCardGrid>
      <StatCard
        data={{
          label: 'Chamados abertos',
          value: data.tickets?.open ?? '—',
          hint: ticketsHint,
        }}
        ui={{ tone: 'info', icon: LifeBuoy }}
        state={{ isLoading: viewState.isTicketsLoading }}
      />
      <StatCard
        data={{
          label: 'Sem estoque',
          value: summary?.inventory.outOfStock ?? 0,
          hint: summary ? `de ${summary.inventory.products} produtos` : null,
        }}
        ui={{ tone: summary?.inventory.outOfStock ? 'danger' : 'neutral', icon: PackageX }}
        state={{ isLoading: viewState.isLoading }}
      />
      <StatCard
        data={{
          label: 'Orçamentos aguardando',
          value: summary?.quotes.pending ?? 0,
          hint: summary ? formatCents(summary.quotes.pendingAmountCents) : null,
        }}
        ui={{ tone: summary?.quotes.pending ? 'warning' : 'neutral', icon: FileText }}
        state={{ isLoading: viewState.isLoading }}
      />
      <StatCard
        data={{
          label: 'Descartado em 30 dias',
          value: summary?.disposals.units ?? 0,
          hint: summary?.disposals.units === 1 ? 'unidade' : 'unidades',
        }}
        ui={{ icon: Trash2 }}
        state={{ isLoading: viewState.isLoading }}
      />
    </StatCardGrid>

    <!-- Os atalhos, com o nome da tela: cada número acima se explica numa delas. -->
    <div class="flex flex-wrap gap-2">
      <ActionButton
        data={{ label: 'Ver os chamados' }}
        ui={{ variant: 'secondary' }}
        actions={{ onClick: actions.onOpenTickets }}
      />
      <ActionButton
        data={{ label: 'Abrir o depósito' }}
        ui={{ variant: 'secondary' }}
        actions={{ onClick: actions.onOpenStock }}
      />
      <ActionButton
        data={{ label: 'Ver os orçamentos' }}
        ui={{ variant: 'secondary' }}
        actions={{ onClick: actions.onOpenQuotes }}
      />
      <ActionButton
        data={{ label: 'Ver os descartes' }}
        ui={{ variant: 'secondary' }}
        actions={{ onClick: actions.onOpenDisposal }}
      />
    </div>

    {#if summary}
      <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <PanelCard
          data={{ title: 'Orçamentos', hint: 'Quanto está em jogo, em reais.' }}
          ui={{ bodyClassName: 'flex flex-col gap-3' }}
        >
          <div>
            <p class="text-ink-900 text-xl font-semibold tabular-nums">
              {formatCents(summary.quotes.pendingAmountCents)}
            </p>
            <p class="text-muted-foreground text-xs">aguardando decisão</p>
          </div>
          <div>
            <p class="text-ink-900 text-xl font-semibold tabular-nums">
              {formatCents(summary.quotes.approvedAmountCents)}
            </p>
            <p class="text-muted-foreground text-xs">aprovado nos últimos 30 dias</p>
          </div>
        </PanelCard>

        <PanelCard
          data={{
            title: 'Últimos movimentos do depósito',
            hint: 'O que entrou, saiu e foi descartado por último.',
          }}
          ui={{ className: 'lg:col-span-2' }}
        >
          {#if summary.recentMovements.length === 0}
            <p class="text-muted-foreground text-sm">
              Nada entrou nem saiu ainda. O primeiro movimento aparece aqui.
            </p>
          {:else}
            <ul class="divide-border flex flex-col divide-y">
              {#each summary.recentMovements as movement (movement.id)}
                <li class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5">
                  <div class="flex min-w-0 items-center gap-2.5">
                    <StatusBadge
                      data={{ label: stockMovementTypeLabel(movement.type) }}
                      ui={{ tone: MOVEMENT_TONE[movement.type], size: 'sm' }}
                    />
                    <span class="text-ink-900 truncate text-sm">{movement.itemName}</span>
                  </div>
                  <span class="text-ink-500 shrink-0 text-xs tabular-nums">
                    {movement.quantity}
                    {inventoryUnitShortLabel(movement.itemUnit)} · {formatDate(movement.createdAt)}
                  </span>
                </li>
              {/each}
            </ul>
          {/if}
        </PanelCard>
      </div>
    {/if}
  {/if}
</div>
