import { goto } from '$app/navigation';
import { createQuery } from '@tanstack/svelte-query';
import { type Budget } from '@template/shared/schemas/budget.schema';

import { budgetApi } from '$lib/api/budget.api';
import { readError } from '$lib/api/http-client';
import { mirrorStore } from '$lib/hooks/mirror-store/mirror-store.svelte';

export type BudgetModel = {
  data: { budget: Budget | null };
  state: {
    isLoading: boolean;
    isRefetching: boolean;
    /** Parque vazio: não há o que cruzar com o depósito ainda. */
    isEmpty: boolean;
    /** Nada a comprar — a boa notícia, e ela merece uma frase própria na tela. */
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

export const BUDGET_QUERY_KEY = ['budget'] as const;

/**
 * O Orçamento: uma consulta só, sem filtro.
 *
 * ZERO marcação — a view recebe tudo por props (CONTRIBUTING §3). A navegação mora aqui:
 * componente de UI não navega.
 */
export function useBudgetModel(): BudgetModel {
  const summary = mirrorStore(
    createQuery({ queryKey: BUDGET_QUERY_KEY, queryFn: () => budgetApi.summary() }),
  );

  return {
    get data() {
      return { budget: summary.current.data ?? null };
    },
    get state() {
      return buildState(summary.current);
    },
    actions: {
      onRetry: () => void summary.current.refetch(),
      onOpenMachine: (computerId) => void goto(`/computers/${computerId}`),
      onOpenComputers: () => void goto('/computers'),
      onOpenParts: () => void goto('/parts'),
    },
  };
}

type SummaryQueryLike = {
  isPending: boolean;
  isSuccess: boolean;
  isRefetching: boolean;
  error: unknown;
  data: Budget | undefined;
};

/**
 * Separado do model porque cada `??` conta como decisão, e o hook passava do teto de
 * complexidade sem ter nenhuma decisão de verdade dentro.
 */
function buildState(summary: SummaryQueryLike): BudgetModel['state'] {
  const budget = summary.isSuccess ? summary.data : undefined;

  return {
    isLoading: summary.isPending,
    isRefetching: summary.isRefetching,
    /* Vazio é NINGUÉM PRECISAR DE NADA; coberto é precisar e o depósito dar conta. São duas
       frases diferentes na tela, e confundi-las esconderia o trabalho do depósito. */
    isEmpty: Boolean(budget && budget.needs.every((need) => need.needed === 0)),
    isCovered: Boolean(
      budget &&
        budget.needs.some((need) => need.needed > 0) &&
        budget.needs.every((need) => need.toBuy === 0),
    ),
    error: readError(summary.error),
  };
}
