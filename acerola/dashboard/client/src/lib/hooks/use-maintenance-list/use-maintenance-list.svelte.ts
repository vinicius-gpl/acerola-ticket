import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { type MaintenanceType } from '@template/shared/domain/maintenance.util';
import {
  type Maintenance,
  type PreventiveDue,
} from '@template/shared/schemas/maintenance.schema';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import { derived, writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { maintenancesApi } from '$lib/api/maintenances.api';
import { mirrorStore } from '$lib/hooks/mirror-store/mirror-store.svelte';

export type MaintenanceListFilter = {
  search: string;
  type: MaintenanceType | '';
  /** Recorta o histórico de uma máquina. Vazio = o parque inteiro. */
  computerId: number | null;
};

export type MaintenanceListModel = {
  data: {
    maintenances: Maintenance[];
    total: number;
    /** A situação da preventiva de cada máquina — não acompanha o filtro da lista. */
    preventive: PreventiveDue[];
    filter: MaintenanceListFilter;
    /** Qual registro está esperando confirmação de exclusão. */
    removing: Maintenance | null;
  };
  state: {
    isLoading: boolean;
    isRefetching: boolean;
    isEmpty: boolean;
    isFilteredOut: boolean;
    isTruncated: boolean;
    isPreventiveLoading: boolean;
    isRemoving: boolean;
    error: string | null;
    /** A falha de uma AÇÃO (excluir), separada da falha de carregar a lista. */
    actionError: string | null;
  };
  actions: {
    onSearchChange: (search: string) => void;
    onTypeChange: (type: MaintenanceType | '') => void;
    onComputerChange: (computerId: number | null) => void;
    onClearFilters: () => void;
    onRetry: () => void;
    onAskRemove: (maintenance: Maintenance) => void;
    onCancelRemove: () => void;
    onConfirmRemove: () => void;
  };
};

const EMPTY_FILTER: MaintenanceListFilter = { search: '', type: '', computerId: null };

export const MAINTENANCES_QUERY_KEY = ['maintenances'] as const;

function scopeOf(filter: MaintenanceListFilter) {
  return {
    search: filter.search.trim() || undefined,
    type: filter.type || undefined,
    computerId: filter.computerId ?? undefined,
  };
}

/**
 * Estado, consultas e handlers do histórico de manutenção. ZERO marcação — a view recebe
 * tudo por props e não sabe de onde o dado veio (CONTRIBUTING §3).
 *
 * Registrar e corrigir NÃO estão aqui: o formulário tem view-model próprio
 * (`use-maintenance-form`), e a rota compõe os dois.
 */
export function useMaintenanceListModel(
  options: { computerId?: number } = {},
): MaintenanceListModel {
  const queryClient = useQueryClient();

  /* O filtro mora numa STORE, e não num `$state`: esta versão do @tanstack/svelte-query
     recebe as opções como store e é ela quem decide quando refazer a busca. */
  const filterStore = writable<MaintenanceListFilter>({
    ...EMPTY_FILTER,
    computerId: options.computerId ?? null,
  });
  const filter = mirrorStore(filterStore);

  const list = mirrorStore(
    createQuery(
      derived(filterStore, (current) => ({
        queryKey: [...MAINTENANCES_QUERY_KEY, 'list', scopeOf(current)],
        queryFn: () =>
          maintenancesApi.list({ ...scopeOf(current), page: 1, pageSize: MAX_PAGE_SIZE }),
      })),
    ),
  );

  /* O quadro de preventivas NÃO recebe o filtro: "quais máquinas estão vencidas" é uma
     pergunta sobre o parque, e não sobre a busca. Ele sumir enquanto a pessoa procura um
     registro faria o atraso parecer resolvido. */
  const preventive = mirrorStore(
    createQuery(
      writable({
        queryKey: [...MAINTENANCES_QUERY_KEY, 'preventive'],
        queryFn: () => maintenancesApi.preventive(),
      }),
    ),
  );

  /* Qual registro está na pergunta de exclusão. É dado de tela, e morre com ela. */
  const removingStore = writable<Maintenance | null>(null);
  const removing = mirrorStore(removingStore);

  const remove = mirrorStore(
    createMutation({
      mutationFn: (id: number) => maintenancesApi.remove(id),
      onSuccess: async () => {
        removingStore.set(null);
        await queryClient.invalidateQueries({ queryKey: MAINTENANCES_QUERY_KEY });
      },
    }),
  );

  return {
    /* `get` em vez de valor: o objeto é montado uma vez e a tela lê dele a cada mudança. */
    get data() {
      return {
        maintenances: list.current.data?.items ?? [],
        total: list.current.data?.total ?? 0,
        preventive: preventive.current.data ?? [],
        filter: filter.current,
        removing: removing.current,
      };
    },
    get state() {
      return {
        ...buildListState(list.current, filter.current),
        isPreventiveLoading: preventive.current.isPending,
        isRemoving: remove.current.isPending,
        actionError: readError(remove.current.error),
      };
    },
    actions: {
      onSearchChange: (search) => filterStore.update((current) => ({ ...current, search })),
      onTypeChange: (type) => filterStore.update((current) => ({ ...current, type })),
      onComputerChange: (computerId) =>
        filterStore.update((current) => ({ ...current, computerId })),
      onClearFilters: () => filterStore.set({ ...EMPTY_FILTER }),
      onRetry: () => {
        void list.current.refetch();
        void preventive.current.refetch();
      },
      onAskRemove: (maintenance) => removingStore.set(maintenance),
      onCancelRemove: () => removingStore.set(null),
      onConfirmRemove: () => {
        const target = removing.current;
        if (!target) return;

        remove.current.mutate(target.id);
      },
    },
  };
}

type MaintenancePage = { items: Maintenance[]; total: number } | undefined;

type ListQueryLike = {
  isPending: boolean;
  isSuccess: boolean;
  isRefetching: boolean;
  error: unknown;
  data: MaintenancePage;
};

function hasAnyFilter(filter: MaintenanceListFilter): boolean {
  if (filter.search.trim() !== '') return true;

  return filter.type !== '' || filter.computerId !== null;
}

function buildListState(
  list: ListQueryLike,
  filter: MaintenanceListFilter,
): Omit<
  MaintenanceListModel['state'],
  'isPreventiveLoading' | 'isRemoving' | 'actionError'
> {
  const count = list.data?.items.length ?? 0;
  /* Vazio só é vazio DEPOIS que a consulta terminou. Dizer "nenhuma manutenção" durante o
     carregamento faz a pessoa achar que o histórico sumiu — e recarregar. */
  const isSettledEmpty = list.isSuccess && count === 0;
  const filtered = hasAnyFilter(filter);

  return {
    isLoading: list.isPending,
    isRefetching: list.isRefetching,
    isEmpty: isSettledEmpty && !filtered,
    isFilteredOut: isSettledEmpty && filtered,
    /* Veio menos do que casou: a tela precisa dizer, nunca truncar calada. */
    isTruncated: (list.data?.total ?? 0) > count,
    error: readError(list.error),
  };
}
