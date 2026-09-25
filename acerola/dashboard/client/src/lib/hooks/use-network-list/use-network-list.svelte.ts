import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import {
  type NetworkEventType,
  type NetworkSeverity,
} from '@template/shared/domain/network-event.util';
import {
  type NetworkEvent,
  type NetworkSummary,
} from '@template/shared/schemas/network-event.schema';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import { derived, writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { networkApi } from '$lib/api/network.api';
import { mirrorStore } from '$lib/hooks/mirror-store/mirror-store.svelte';

export type NetworkFilter = {
  type: NetworkEventType | '';
  severity: NetworkSeverity | '';
  onlyOpen: boolean;
  days: number;
};

export type NetworkListModel = {
  data: {
    events: NetworkEvent[];
    total: number;
    summary: NetworkSummary | null;
    filter: NetworkFilter;
  };
  state: {
    isLoading: boolean;
    isRefetching: boolean;
    isEmpty: boolean;
    isFilteredOut: boolean;
    isTruncated: boolean;
    isSummaryLoading: boolean;
    isSaving: boolean;
    error: string | null;
    actionError: string | null;
  };
  actions: {
    onTypeChange: (type: NetworkEventType | '') => void;
    onSeverityChange: (severity: NetworkSeverity | '') => void;
    onOnlyOpenChange: (onlyOpen: boolean) => void;
    onPeriodChange: (days: number) => void;
    onClearFilters: () => void;
    onRetry: () => void;
    onResolveChange: (event: NetworkEvent, isResolved: boolean) => void;
  };
};

/** O recorte padrão: o mês, como no painel. */
const DEFAULT_DAYS = 30;

const EMPTY_FILTER: NetworkFilter = {
  type: '',
  severity: '',
  onlyOpen: false,
  days: DEFAULT_DAYS,
};

export const NETWORK_QUERY_KEY = ['network'] as const;

function scopeOf(filter: NetworkFilter) {
  return {
    type: filter.type || undefined,
    severity: filter.severity || undefined,
    onlyOpen: filter.onlyOpen || undefined,
    days: filter.days,
  };
}

/**
 * Os eventos de rede. ZERO marcação — a view recebe tudo por props (CONTRIBUTING §3).
 *
 * Marcar como resolvido é a única escrita daqui, e ela não apaga nada: o evento continua no
 * histórico, porque "a internet caiu três vezes este mês" é uma pergunta que só o histórico
 * responde.
 */
export function useNetworkListModel(): NetworkListModel {
  const queryClient = useQueryClient();

  /* O filtro mora numa STORE, e não num `$state`: esta versão do @tanstack/svelte-query
     recebe as opções como store e é ela quem decide quando refazer a busca. */
  const filterStore = writable<NetworkFilter>({ ...EMPTY_FILTER });
  const filter = mirrorStore(filterStore);

  const list = mirrorStore(
    createQuery(
      derived(filterStore, (current) => ({
        queryKey: [...NETWORK_QUERY_KEY, 'list', scopeOf(current)],
        queryFn: () => networkApi.list({ ...scopeOf(current), page: 1, pageSize: MAX_PAGE_SIZE }),
      })),
    ),
  );

  /* O resumo acompanha só o PERÍODO, e não os outros filtros: "quantas quedas houve no mês"
     não muda porque alguém está procurando um evento específico. */
  const summary = mirrorStore(
    createQuery(
      derived(filterStore, (current) => ({
        queryKey: [...NETWORK_QUERY_KEY, 'summary', current.days],
        queryFn: () => networkApi.summary(current.days),
      })),
    ),
  );

  const resolve = mirrorStore(
    createMutation({
      mutationFn: ({ id, isResolved }: { id: number; isResolved: boolean }) =>
        networkApi.resolve(id, isResolved),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: NETWORK_QUERY_KEY }),
    }),
  );

  return {
    get data() {
      return {
        events: list.current.data?.items ?? [],
        total: list.current.data?.total ?? 0,
        summary: summary.current.data ?? null,
        filter: filter.current,
      };
    },
    get state() {
      const count = list.current.data?.items.length ?? 0;
      /* Vazio só é vazio DEPOIS que a consulta terminou. */
      const isSettledEmpty = list.current.isSuccess && count === 0;
      const filtered =
        filter.current.type !== '' || filter.current.severity !== '' || filter.current.onlyOpen;

      return {
        isLoading: list.current.isPending,
        isRefetching: list.current.isRefetching,
        isEmpty: isSettledEmpty && !filtered,
        isFilteredOut: isSettledEmpty && filtered,
        isTruncated: (list.current.data?.total ?? 0) > count,
        isSummaryLoading: summary.current.isPending,
        isSaving: resolve.current.isPending,
        error: readError(list.current.error),
        actionError: readError(resolve.current.error),
      };
    },
    actions: {
      onTypeChange: (type) => filterStore.update((current) => ({ ...current, type })),
      onSeverityChange: (severity) => filterStore.update((current) => ({ ...current, severity })),
      onOnlyOpenChange: (onlyOpen) => filterStore.update((current) => ({ ...current, onlyOpen })),
      onPeriodChange: (days) => filterStore.update((current) => ({ ...current, days })),
      onClearFilters: () => filterStore.set({ ...EMPTY_FILTER }),
      onRetry: () => {
        void list.current.refetch();
        void summary.current.refetch();
      },
      onResolveChange: (event, isResolved) =>
        resolve.current.mutate({ id: event.id, isResolved }),
    },
  };
}
