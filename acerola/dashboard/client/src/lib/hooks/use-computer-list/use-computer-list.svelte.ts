import { goto } from '$app/navigation';
import { createQuery } from '@tanstack/svelte-query';
import { type HealthStatus } from '@template/shared/domain/computer-health.util';
import { type Department } from '@template/shared/domain/department.util';
import { type Computer } from '@template/shared/schemas/computer.schema';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import { derived, writable } from 'svelte/store';

import { computersApi } from '$lib/api/computers.api';
import { readError } from '$lib/api/http-client';
import { mirrorStore } from '$lib/hooks/mirror-store/mirror-store.svelte';

export type ComputerListFilter = {
  search: string;
  department: Department | '';
  healthStatus: HealthStatus | '';
  /** Arquivadas saíram de uso: só aparecem quando alguém pede por elas. */
  includeArchived: boolean;
};

/** Os quatro números do topo da tela: o estado do parque de relance. */
export type ComputerSummary = {
  total: number;
  online: number;
  critical: number;
  attention: number;
  /** Cadastradas cujo agente nunca conectou — falta instalar o agente nelas. */
  neverSeen: number;
};

export type ComputerListModel = {
  data: {
    computers: Computer[];
    /** Quantas casaram com o filtro — pode ser mais do que as que vieram na página. */
    total: number;
    /** O resumo do parque INTEIRO, que não acompanha o filtro. */
    summary: ComputerSummary | null;
    filter: ComputerListFilter;
  };
  state: {
    isLoading: boolean;
    isRefetching: boolean;
    /** Não existe máquina nenhuma: o próximo passo é cadastrar a primeira. */
    isEmpty: boolean;
    /** Existem máquinas, mas o filtro escondeu todas: o próximo passo é limpar o filtro. */
    isFilteredOut: boolean;
    isTruncated: boolean;
    isSummaryLoading: boolean;
    error: string | null;
  };
  actions: {
    onSearchChange: (search: string) => void;
    onDepartmentChange: (department: Department | '') => void;
    onHealthStatusChange: (healthStatus: HealthStatus | '') => void;
    onArchivedChange: (includeArchived: boolean) => void;
    onClearFilters: () => void;
    onRetry: () => void;
    onOpen: (computer: Computer) => void;
  };
};

const EMPTY_FILTER: ComputerListFilter = {
  search: '',
  department: '',
  healthStatus: '',
  includeArchived: false,
};

export const COMPUTERS_QUERY_KEY = ['computers'] as const;

function scopeOf(filter: ComputerListFilter) {
  return {
    search: filter.search.trim() || undefined,
    department: filter.department || undefined,
    healthStatus: filter.healthStatus || undefined,
    includeArchived: filter.includeArchived || undefined,
  };
}

/**
 * O resumo do parque.
 *
 * Exportado e puro para ter teste próprio: é ele que decide o que a pessoa lê como "o estado
 * do parque hoje", e errar uma contagem aqui é dizer que está tudo bem quando não está.
 */
export function summarizeComputers(computers: readonly Computer[]): ComputerSummary {
  return {
    total: computers.length,
    online: computers.filter((computer) => computer.isOnline).length,
    critical: computers.filter((computer) => computer.healthStatus === 'critical').length,
    attention: computers.filter((computer) => computer.healthStatus === 'attention').length,
    neverSeen: computers.filter((computer) => computer.lastSeenAt === null).length,
  };
}

/**
 * Estado, consultas e handlers do inventário. ZERO marcação — a view recebe tudo por props e
 * não sabe de onde o dado veio (CONTRIBUTING §3).
 *
 * Cadastrar e abrir a ficha NÃO estão aqui: o cadastro tem view-model próprio
 * (`use-computer-form`) e a ficha é outra rota.
 */
export function useComputerListModel(): ComputerListModel {
  /* O filtro mora numa STORE, e não num `$state`: esta versão do @tanstack/svelte-query
     recebe as opções como store e é ela quem decide quando refazer a busca. Com `$state`,
     duas mudanças seguidas de filtro chegariam à consulta como uma emissão só, com o valor
     do meio — e a API seria chamada sem um dos filtros. */
  const filterStore = writable<ComputerListFilter>({ ...EMPTY_FILTER });
  const filter = mirrorStore(filterStore);

  const list = mirrorStore(
    createQuery(
      derived(filterStore, (current) => ({
        queryKey: [...COMPUTERS_QUERY_KEY, 'list', scopeOf(current)],
        queryFn: () => computersApi.list({ ...scopeOf(current), page: 1, pageSize: MAX_PAGE_SIZE }),
      })),
    ),
  );

  /* O resumo NÃO recebe o filtro: "quantas máquinas estão críticas" é uma pergunta sobre o
     parque, não sobre a busca. Recalculá-lo a cada filtro faria o número cair enquanto a
     pessoa procura uma máquina, como se o problema tivesse sido resolvido pela busca. */
  const summary = mirrorStore(
    createQuery(
      writable({
        queryKey: [...COMPUTERS_QUERY_KEY, 'summary'],
        queryFn: () => computersApi.list({ page: 1, pageSize: MAX_PAGE_SIZE }),
      }),
    ),
  );

  return {
    /* `get` em vez de valor: o objeto é montado uma vez e a tela lê dele a cada mudança. Com
       valores fixos, a lista congelaria no primeiro carregamento. */
    get data() {
      return {
        computers: list.current.data?.items ?? [],
        total: list.current.data?.total ?? 0,
        summary: summary.current.data ? summarizeComputers(summary.current.data.items) : null,
        filter: filter.current,
      };
    },
    get state() {
      return {
        ...buildListState(list.current, filter.current),
        isSummaryLoading: summary.current.isPending,
      };
    },
    actions: {
      onSearchChange: (search) => filterStore.update((current) => ({ ...current, search })),
      onDepartmentChange: (department) =>
        filterStore.update((current) => ({ ...current, department })),
      onHealthStatusChange: (healthStatus) =>
        filterStore.update((current) => ({ ...current, healthStatus })),
      onArchivedChange: (includeArchived) =>
        filterStore.update((current) => ({ ...current, includeArchived })),
      onClearFilters: () => filterStore.set({ ...EMPTY_FILTER }),
      onRetry: () => {
        void list.current.refetch();
        void summary.current.refetch();
      },
      /* A navegação mora no view-model: componente de UI não navega (CONTRIBUTING §3). */
      onOpen: (computer) => void goto(`/computers/${computer.id}`),
    },
  };
}

type ComputerPage = { items: Computer[]; total: number } | undefined;

type ListQueryLike = {
  isPending: boolean;
  isSuccess: boolean;
  isRefetching: boolean;
  error: unknown;
  data: ComputerPage;
};

function hasAnyFilter(filter: ComputerListFilter): boolean {
  if (filter.search.trim() !== '') return true;

  return filter.department !== '' || filter.healthStatus !== '' || filter.includeArchived;
}

function buildListState(
  list: ListQueryLike,
  filter: ComputerListFilter,
): Omit<ComputerListModel['state'], 'isSummaryLoading'> {
  const count = list.data?.items.length ?? 0;
  /* Vazio só é vazio DEPOIS que a consulta terminou. Mostrar "nenhuma máquina" durante o
     carregamento faz a pessoa achar que o inventário sumiu — e recarregar. */
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
