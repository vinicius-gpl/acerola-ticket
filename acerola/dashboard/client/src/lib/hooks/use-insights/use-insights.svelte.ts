import { goto } from '$app/navigation';
import { createQuery } from '@tanstack/svelte-query';
import {
  DEFAULT_INSIGHT_DAYS,
  type Insights,
} from '@template/shared/schemas/insight.schema';
import { derived, writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { insightsApi } from '$lib/api/insights.api';
import { mirrorStore } from '$lib/hooks/mirror-store/mirror-store.svelte';

export type InsightsModel = {
  data: { insights: Insights | null; days: number };
  state: {
    isLoading: boolean;
    isRefetching: boolean;
    /** Parque vazio: não há o que cruzar ainda. */
    isEmpty: boolean;
    error: string | null;
  };
  actions: {
    onPeriodChange: (days: number) => void;
    onRetry: () => void;
    onOpenMachine: (computerId: number) => void;
    onOpenComputers: () => void;
  };
};

export const INSIGHTS_QUERY_KEY = ['insights'] as const;

/**
 * A Inteligência: uma consulta só, refeita quando o período muda.
 *
 * ZERO marcação — a view recebe tudo por props (CONTRIBUTING §3). A navegação mora aqui:
 * componente de UI não navega.
 */
export function useInsightsModel(): InsightsModel {
  /* O período mora numa STORE, e não num `$state`: esta versão do @tanstack/svelte-query
     recebe as opções como store e é ela quem decide quando refazer a busca. */
  const daysStore = writable(DEFAULT_INSIGHT_DAYS);
  const days = mirrorStore(daysStore);

  const summary = mirrorStore(
    createQuery(
      derived(daysStore, (current) => ({
        queryKey: [...INSIGHTS_QUERY_KEY, current],
        queryFn: () => insightsApi.summary(current),
      })),
    ),
  );

  return {
    get data() {
      return { insights: summary.current.data ?? null, days: days.current };
    },
    get state() {
      return buildState(summary.current);
    },
    actions: {
      onPeriodChange: (value) => daysStore.set(value),
      onRetry: () => void summary.current.refetch(),
      onOpenMachine: (computerId) => void goto(`/computers/${computerId}`),
      onOpenComputers: () => void goto('/computers'),
    },
  };
}

type SummaryQueryLike = {
  isPending: boolean;
  isSuccess: boolean;
  isRefetching: boolean;
  error: unknown;
  data: Insights | undefined;
};

/**
 * Separado do model porque cada `??` conta como decisão, e o hook passava do teto de
 * complexidade sem ter nenhuma decisão de verdade dentro.
 */
function buildState(summary: SummaryQueryLike): InsightsModel['state'] {
  return {
    isLoading: summary.isPending,
    isRefetching: summary.isRefetching,
    /* Vazio é NÃO TER MÁQUINA — e não "nada a recomendar". Um parque saudável tem muito a
       dizer (as reservas, por exemplo); um parque vazio não tem nada. */
    isEmpty: Boolean(summary.isSuccess && summary.data && isParkEmpty(summary.data)),
    error: readError(summary.error),
  };
}

function isParkEmpty(insights: Insights): boolean {
  return (
    insights.overloaded.length === 0 &&
    insights.upgrades.length === 0 &&
    insights.troublesome.length === 0 &&
    insights.spares.length === 0
  );
}
