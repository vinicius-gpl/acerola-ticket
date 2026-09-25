import { goto } from '$app/navigation';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { type DisposalType } from '@template/shared/domain/disposal.util';
import { type Computer } from '@template/shared/schemas/computer.schema';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import { derived, writable } from 'svelte/store';

import { computersApi } from '$lib/api/computers.api';
import { readError } from '$lib/api/http-client';
import { mirrorStore } from '$lib/hooks/mirror-store/mirror-store.svelte';
import { COMPUTERS_QUERY_KEY } from '$lib/hooks/use-computer-list/use-computer-list.svelte';

export type DisposalFilter = {
  search: string;
  type: DisposalType | '';
};

export type DisposalSummary = {
  total: number;
  defect: number;
  scrap: number;
};

export type DisposalListModel = {
  data: {
    computers: Computer[];
    total: number;
    summary: DisposalSummary;
    filter: DisposalFilter;
    /** Qual máquina está esperando a confirmação de voltar ao inventário. */
    restoring: Computer | null;
  };
  state: {
    isLoading: boolean;
    isRefetching: boolean;
    isEmpty: boolean;
    isFilteredOut: boolean;
    isRestoring: boolean;
    error: string | null;
    actionError: string | null;
  };
  actions: {
    onSearchChange: (search: string) => void;
    onTypeChange: (type: DisposalType | '') => void;
    onClearFilters: () => void;
    onRetry: () => void;
    onOpenMachine: (computer: Computer) => void;
    onAskRestore: (computer: Computer) => void;
    onCancelRestore: () => void;
    onConfirmRestore: () => void;
  };
};

const EMPTY_FILTER: DisposalFilter = { search: '', type: '' };

function scopeOf(filter: DisposalFilter) {
  return {
    onlyDisposed: true,
    search: filter.search.trim() || undefined,
    disposalType: filter.type || undefined,
  };
}

/**
 * O resumo do que saiu de uso.
 *
 * Exportado e puro para ter teste próprio: "com defeito" e "lixo" levam a decisões
 * diferentes — a primeira ainda rende peça, a segunda só ocupa espaço.
 */
export function summarizeDisposal(computers: readonly Computer[]): DisposalSummary {
  return {
    total: computers.length,
    defect: computers.filter((computer) => computer.disposalType === 'defect').length,
    scrap: computers.filter((computer) => computer.disposalType === 'scrap').length,
  };
}

/**
 * A lista do que saiu de uso. ZERO marcação — a view recebe tudo por props
 * (CONTRIBUTING §3).
 *
 * Descartar acontece na FICHA da máquina, não aqui: é lá que a pessoa está olhando quando
 * decide. Esta tela é o histórico, e a única escrita dela é desfazer — devolver ao inventário.
 */
export function useDisposalListModel(): DisposalListModel {
  const queryClient = useQueryClient();

  /* O filtro mora numa STORE, e não num `$state`: esta versão do @tanstack/svelte-query
     recebe as opções como store e é ela quem decide quando refazer a busca. */
  const filterStore = writable<DisposalFilter>({ ...EMPTY_FILTER });
  const filter = mirrorStore(filterStore);

  const list = mirrorStore(
    createQuery(
      derived(filterStore, (current) => ({
        queryKey: [...COMPUTERS_QUERY_KEY, 'disposed', scopeOf(current)],
        queryFn: () => computersApi.list({ ...scopeOf(current), page: 1, pageSize: MAX_PAGE_SIZE }),
      })),
    ),
  );

  const restoringStore = writable<Computer | null>(null);
  const restoring = mirrorStore(restoringStore);

  const restore = mirrorStore(
    createMutation({
      mutationFn: (id: number) => computersApi.restore(id),
      onSuccess: async () => {
        restoringStore.set(null);
        /* A máquina volta para o inventário: as duas listas mudam, e o painel também. */
        await queryClient.invalidateQueries({ queryKey: COMPUTERS_QUERY_KEY });
      },
    }),
  );

  return {
    get data() {
      const computers = list.current.data?.items ?? [];

      return {
        computers,
        total: list.current.data?.total ?? 0,
        summary: summarizeDisposal(computers),
        filter: filter.current,
        restoring: restoring.current,
      };
    },
    get state() {
      const count = list.current.data?.items.length ?? 0;
      /* Vazio só é vazio DEPOIS que a consulta terminou. */
      const isSettledEmpty = list.current.isSuccess && count === 0;
      const filtered = filter.current.search.trim() !== '' || filter.current.type !== '';

      return {
        isLoading: list.current.isPending,
        isRefetching: list.current.isRefetching,
        isEmpty: isSettledEmpty && !filtered,
        isFilteredOut: isSettledEmpty && filtered,
        isRestoring: restore.current.isPending,
        error: readError(list.current.error),
        actionError: readError(restore.current.error),
      };
    },
    actions: {
      onSearchChange: (search) => filterStore.update((current) => ({ ...current, search })),
      onTypeChange: (type) => filterStore.update((current) => ({ ...current, type })),
      onClearFilters: () => filterStore.set({ ...EMPTY_FILTER }),
      onRetry: () => void list.current.refetch(),
      onOpenMachine: (computer) => void goto(`/computers/${computer.id}`),
      onAskRestore: (computer) => restoringStore.set(computer),
      onCancelRestore: () => restoringStore.set(null),
      onConfirmRestore: () => {
        const target = restoring.current;
        if (!target) return;

        restore.current.mutate(target.id);
      },
    },
  };
}
