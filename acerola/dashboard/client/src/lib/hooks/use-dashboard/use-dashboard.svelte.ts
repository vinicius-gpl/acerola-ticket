import { goto } from '$app/navigation';
import { createQuery } from '@tanstack/svelte-query';
import {
  DEFAULT_PERIOD_DAYS,
  type Dashboard,
  type ProblemMachine,
} from '@template/shared/schemas/dashboard.schema';
import { derived, writable } from 'svelte/store';

import { dashboardApi } from '$lib/api/dashboard.api';
import { readError } from '$lib/api/http-client';
import { mirrorStore } from '$lib/hooks/mirror-store/mirror-store.svelte';

export type DashboardModel = {
  data: {
    summary: Dashboard | null;
    /** O recorte escolhido, em dias. */
    days: number;
  };
  state: {
    isLoading: boolean;
    isRefetching: boolean;
    /** Sistema recém-instalado: não há o que resumir ainda. */
    isEmpty: boolean;
    error: string | null;
  };
  actions: {
    onPeriodChange: (days: number) => void;
    onRetry: () => void;
    onOpenMachine: (machine: ProblemMachine) => void;
    onOpenComputers: () => void;
    onOpenTickets: () => void;
    onOpenMaintenance: () => void;
    onOpenParts: () => void;
  };
};

export const DASHBOARD_QUERY_KEY = ['dashboard'] as const;

/**
 * O painel: uma consulta só, refeita quando o período muda.
 *
 * ZERO marcação — a view recebe tudo por props e não sabe de onde o dado veio
 * (CONTRIBUTING §3). A navegação mora aqui: componente de UI não navega.
 */
export function useDashboardModel(): DashboardModel {
  /* O período mora numa STORE, e não num `$state`: esta versão do @tanstack/svelte-query
     recebe as opções como store e é ela quem decide quando refazer a busca. */
  const daysStore = writable(DEFAULT_PERIOD_DAYS);
  const days = mirrorStore(daysStore);

  const summary = mirrorStore(
    createQuery(
      derived(daysStore, (current) => ({
        queryKey: [...DASHBOARD_QUERY_KEY, current],
        queryFn: () => dashboardApi.summary(current),
      })),
    ),
  );

  return {
    /* `get` em vez de valor: o objeto é montado uma vez e a tela lê dele a cada mudança. */
    get data() {
      return { summary: summary.current.data ?? null, days: days.current };
    },
    get state() {
      return buildState(summary.current);
    },
    actions: {
      onPeriodChange: (value) => daysStore.set(value),
      onRetry: () => void summary.current.refetch(),
      onOpenMachine: (machine) => void goto(`/computers/${machine.computerId}`),
      onOpenComputers: () => void goto('/computers'),
      onOpenTickets: () => void goto('/tickets'),
      onOpenMaintenance: () => void goto('/maintenance'),
      onOpenParts: () => void goto('/parts'),
    },
  };
}

type SummaryQueryLike = {
  isPending: boolean;
  isSuccess: boolean;
  isRefetching: boolean;
  error: unknown;
  data: Dashboard | undefined;
};

/**
 * Separado do model porque cada `??` conta como decisão, e o hook passava do teto de
 * complexidade sem ter nenhuma decisão de verdade dentro.
 */
function buildState(summary: SummaryQueryLike): DashboardModel['state'] {
  const data = summary.data;

  return {
    isLoading: summary.isPending,
    isRefetching: summary.isRefetching,
    /* Vazio de verdade: nenhuma máquina, nenhum chamado, nenhuma peça. É o sistema recém
       instalado — e a tela precisa dizer por onde começar, em vez de mostrar sete zeros. */
    isEmpty: Boolean(
      summary.isSuccess &&
        data &&
        data.park.total === 0 &&
        data.tickets.open === 0 &&
        data.tickets.openedInPeriod === 0 &&
        data.parts.kinds === 0,
    ),
    error: readError(summary.error),
  };
}
