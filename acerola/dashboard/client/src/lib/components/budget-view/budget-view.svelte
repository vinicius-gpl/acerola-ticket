<script lang="ts" module>
  import {
    budgetNeedHint,
    budgetNeedLabel,
    budgetNeedValueText,
    type BudgetNeedKey,
  } from '@template/shared/domain/budget-need.util';
  import { departmentLabel } from '@template/shared/domain/department.util';
  import {
    PRICE_REFERENCE_UPDATED_AT,
    estimateFor,
    referencesFor,
  } from '@template/shared/domain/price-reference.util';
  import {
    type Budget,
    type BudgetMachine,
    type BudgetNeed,
  } from '@template/shared/schemas/budget.schema';

  import { formatMoney, formatMoneyRange } from '$lib/utils/format-money';

  /**
   * O ORÇAMENTO: o que comprar, já descontando o que o depósito tem.
   *
   * Função pura de props: não busca nada e não navega. Por isso abre no Storybook carregando,
   * com compra pendente, com o depósito cobrindo tudo e com o parque vazio.
   *
   * Cada necessidade mostra a CONTA INTEIRA na mesma linha — "12 precisam · depósito tem 4 ·
   * comprar 8". Mostrar só o "8" economizaria espaço e tiraria de quem lê a chance de
   * conferir de onde o número veio, que é justamente o que se pergunta numa reunião de
   * compra.
   */
  export type BudgetViewProps = {
    data: { budget: Budget | null };
    state: {
      isLoading: boolean;
      isRefetching?: boolean;
      isEmpty: boolean;
      isCovered: boolean;
      error: string | null;
    };
    actions: {
      onRetry: () => void;
      onOpenMachine: (computerId: number) => void;
      onOpenComputers: () => void;
      onOpenParts: () => void;
    };
  };

  /** O nome que a pessoa reconhece: o apelido ganha do nome técnico da máquina. */
  export function machineLabelOf(machine: BudgetMachine): string {
    return machine.computerDisplayName?.trim() || machine.computerName;
  }

  export function departmentOf(machine: BudgetMachine): string {
    return machine.department ? departmentLabel(machine.department as never) : 'Sem departamento';
  }

  /** O número que colocou a máquina na lista, com a unidade: "4 GB de memória". */
  export function machineValueOf(need: BudgetNeed, machine: BudgetMachine): string {
    return budgetNeedValueText(need.key, machine.value);
  }

  /**
   * A conta inteira em uma frase, para quem lê com leitor de tela.
   *
   * A mesma informação que os três números da linha, escrita por extenso: quem ouve a tela
   * não tem como saber que "12 · 4 · 8" é uma subtração.
   */
  export function needSummaryOf(need: BudgetNeed): string {
    if (need.needed === 0) return 'Nenhuma máquina precisa disso agora.';
    if (need.toBuy === 0) {
      return `${need.needed} precisam, e o depósito tem ${need.inStock} — não precisa comprar.`;
    }

    return `${need.needed} precisam, o depósito tem ${need.inStock} — faltam ${need.toBuy}.`;
  }

  /** A estimativa da compra, ou nada quando não há o que comprar. */
  export function estimateTextOf(key: BudgetNeedKey, toBuy: number): string | null {
    const estimate = estimateFor(key, toBuy);
    if (!estimate) return null;

    return formatMoneyRange(estimate.min, estimate.max);
  }
</script>

<script lang="ts">
  import PartyPopper from '@lucide/svelte/icons/party-popper';
  import ShoppingCart from '@lucide/svelte/icons/shopping-cart';

  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import EmptyState from '$lib/components/empty-state/empty-state.svelte';
  import ErrorState from '$lib/components/error-state/error-state.svelte';
  import PageHeader from '$lib/components/page-header/page-header.svelte';
  import StatusBadge from '$lib/components/status-badge/status-badge.svelte';
  import { formatDate } from '$lib/utils/format-date';

  let { data, state: viewState, actions }: BudgetViewProps = $props();

  const budget = $derived(data.budget);

  /* A data da referência é ISO no domínio e vira dd/mm/aaaa aqui, como no resto do sistema. */
  const referenceDate = $derived(formatDate(`${PRICE_REFERENCE_UPDATED_AT}T12:00:00.000Z`));
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-10 sm:px-6">
  <PageHeader
    data={{
      title: 'Orçamento',
      description: 'O que comprar, já descontando o que o depósito tem na prateleira.',
    }}
  >
    <ActionButton
      data={{ label: 'Ver o depósito' }}
      ui={{ variant: 'secondary' }}
      actions={{ onClick: actions.onOpenParts }}
    />
  </PageHeader>

  <!-- Estados na frente, conteúdo por último e sem aninhamento (CONTRIBUTING §2). -->
  {#if viewState.error}
    <ErrorState
      data={{ title: 'Não consegui montar o orçamento', message: viewState.error }}
      state={{ isRetrying: viewState.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if viewState.isLoading}
    <p class="text-ink-500 py-10 text-center text-sm">Cruzando o parque com o depósito…</p>
  {:else if viewState.isEmpty}
    <EmptyState
      data={{
        title: 'Nada a orçar ainda',
        description:
          'Esta tela compara o que as máquinas precisam com o que o depósito tem. Cadastre as máquinas no Inventário e instale o agente nelas — sem medição, pedir peça é comprar no escuro.',
      }}
      ui={{ icon: ShoppingCart }}
    >
      <ActionButton
        data={{ label: 'Ir para o Inventário' }}
        actions={{ onClick: actions.onOpenComputers }}
      />
    </EmptyState>
  {:else if budget}
    {#if viewState.isCovered}
      <p class="bg-card flex items-center gap-2 rounded-xl border p-4 text-sm text-emerald-700">
        <PartyPopper class="size-4 shrink-0" aria-hidden="true" />
        Não precisa comprar nada: tudo o que o parque pede já está no depósito.
      </p>
    {/if}

    {#each budget.needs as need (need.key)}
      <section class="bg-card rounded-xl border p-4">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="min-w-0">
            <h2 class="text-ink-900 text-sm font-semibold">{budgetNeedLabel(need.key)}</h2>
            <p class="text-ink-500 text-xs">{budgetNeedHint(need.key)}</p>
          </div>

          {#if need.toBuy > 0}
            <StatusBadge data={{ label: `Comprar ${need.toBuy}` }} ui={{ tone: 'warning' }} />
          {:else}
            <StatusBadge data={{ label: 'Nada a comprar' }} ui={{ tone: 'success' }} />
          {/if}
        </div>

        <!-- A conta inteira à vista: quem lê confere de onde saiu o número. -->
        <p class="text-ink-700 mt-3 text-sm">{needSummaryOf(need)}</p>

        {#if estimateTextOf(need.key, need.toBuy)}
          <p class="text-ink-500 mt-1 text-xs">
            Estimativa: <span class="text-ink-900 font-semibold"
              >{estimateTextOf(need.key, need.toBuy)}</span
            >
            — faixa de referência de {referenceDate}, não é cotação.
          </p>
        {/if}

        {#if need.machines.length > 0}
          <div class="mt-3">
            <h3 class="text-ink-700 text-xs font-semibold">Quem precisa</h3>
            <ul class="mt-1 flex flex-col divide-y">
              {#each need.machines as machine (machine.computerId)}
                <li class="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div class="min-w-0">
                    <p class="text-ink-900 text-sm font-semibold break-words">
                      {machineLabelOf(machine)}
                    </p>
                    <p class="text-ink-500 text-xs">
                      {departmentOf(machine)} · {machineValueOf(need, machine)}
                    </p>
                  </div>
                  <ActionButton
                    data={{ label: 'Abrir ficha' }}
                    ui={{ variant: 'secondary', size: 'sm' }}
                    actions={{ onClick: () => actions.onOpenMachine(machine.computerId) }}
                  />
                </li>
              {/each}
            </ul>

            {#if need.needed > need.machines.length}
              <p class="text-ink-500 mt-2 text-xs">
                E mais {need.needed - need.machines.length} máquina(s) na mesma situação —
                <button
                  type="button"
                  class="underline underline-offset-2"
                  onclick={actions.onOpenComputers}
                >
                  ver no Inventário
                </button>
              </p>
            {/if}
          </div>
        {/if}

        <!-- Onde procurar: a lista existe para ninguém começar a pesquisa do zero. -->
        <div class="mt-3 border-t pt-3">
          <h3 class="text-ink-700 text-xs font-semibold">Referência de preço e onde procurar</h3>
          <ul class="mt-1 flex flex-col gap-1">
            {#each referencesFor(need.key) as reference (reference.name)}
              <li class="flex flex-wrap items-baseline gap-x-2 text-xs">
                <span class="text-ink-900">{reference.name}</span>
                <span class="text-ink-500">
                  {formatMoney(reference.minPrice)} a {formatMoney(reference.maxPrice)}
                </span>
                {#each reference.links as link (link.store)}
                  <a
                    class="text-ink-700 underline underline-offset-2"
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.store}
                  </a>
                {/each}
              </li>
            {/each}
          </ul>
        </div>
      </section>
    {/each}

    <p class="text-ink-500 text-xs">
      As faixas de preço foram conferidas em {referenceDate} e servem para dar ordem de
      grandeza — confirme na loja antes de pedir a compra. O depósito soma peça nova e usada:
      se a compra precisa ser de peça nova, confira a prateleira antes.
    </p>
  {/if}
</div>
