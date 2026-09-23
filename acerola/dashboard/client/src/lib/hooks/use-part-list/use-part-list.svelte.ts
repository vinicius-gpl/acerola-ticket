import { createQuery } from '@tanstack/svelte-query';
import {
  type PartCategory,
  type PartCondition,
} from '@template/shared/domain/part-catalog.util';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import { type Part } from '@template/shared/schemas/part.schema';
import { derived, writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { partsApi } from '$lib/api/parts.api';
import { mirrorStore } from '$lib/hooks/mirror-store/mirror-store.svelte';

export type PartListFilter = {
  search: string;
  category: PartCategory | '';
  condition: PartCondition | '';
  /** Só o que tem peça na prateleira — o que se pergunta antes de sair comprando. */
  inStockOnly: boolean;
};

/** Os três números do topo: o depósito de relance. */
export type PartSummary = {
  /** Quantas linhas de peça existem no cadastro. */
  kinds: number;
  /** Quantas peças, somando tudo que está na prateleira. */
  items: number;
  /** Cadastradas e com a prateleira vazia — é por elas que se descobre o que comprar. */
  outOfStock: number;
};

export type PartListModel = {
  data: {
    parts: Part[];
    total: number;
    summary: PartSummary | null;
    filter: PartListFilter;
  };
  state: {
    isLoading: boolean;
    isRefetching: boolean;
    isEmpty: boolean;
    isFilteredOut: boolean;
    isTruncated: boolean;
    isSummaryLoading: boolean;
    error: string | null;
  };
  actions: {
    onSearchChange: (search: string) => void;
    onCategoryChange: (category: PartCategory | '') => void;
    onConditionChange: (condition: PartCondition | '') => void;
    onInStockOnlyChange: (inStockOnly: boolean) => void;
    onClearFilters: () => void;
    onRetry: () => void;
  };
};

const EMPTY_FILTER: PartListFilter = {
  search: '',
  category: '',
  condition: '',
  inStockOnly: false,
};

export const PARTS_QUERY_KEY = ['parts'] as const;

function scopeOf(filter: PartListFilter) {
  return {
    search: filter.search.trim() || undefined,
    category: filter.category || undefined,
    condition: filter.condition || undefined,
    inStockOnly: filter.inStockOnly || undefined,
  };
}

/**
 * O resumo do depósito.
 *
 * Exportado e puro para ter teste próprio: "quantas peças temos" e "quantos tipos de peça
 * temos" são perguntas diferentes, e trocar uma pela outra faria alguém comprar o que já tem.
 */
export function summarizeParts(parts: readonly Part[]): PartSummary {
  return {
    kinds: parts.length,
    items: parts.reduce((total, part) => total + part.balance, 0),
    outOfStock: parts.filter((part) => part.balance === 0).length,
  };
}

/**
 * Estado, consultas e handlers do depósito. ZERO marcação — a view recebe tudo por props e
 * não sabe de onde o dado veio (CONTRIBUTING §3).
 *
 * Cadastrar peça e movimentar NÃO estão aqui: cada um tem view-model próprio, porque são
 * formulários e formulário morre junto com o diálogo que o abriu.
 */
export function usePartListModel(): PartListModel {
  /* O filtro mora numa STORE, e não num `$state`: esta versão do @tanstack/svelte-query
     recebe as opções como store e é ela quem decide quando refazer a busca. */
  const filterStore = writable<PartListFilter>({ ...EMPTY_FILTER });
  const filter = mirrorStore(filterStore);

  const list = mirrorStore(
    createQuery(
      derived(filterStore, (current) => ({
        queryKey: [...PARTS_QUERY_KEY, 'list', scopeOf(current)],
        queryFn: () => partsApi.list({ ...scopeOf(current), page: 1, pageSize: MAX_PAGE_SIZE }),
      })),
    ),
  );

  /* O resumo NÃO recebe o filtro: "quantas peças temos no depósito" é uma pergunta sobre o
     depósito, não sobre a busca. Ele mudar enquanto a pessoa procura uma peça faria o
     estoque parecer estar sumindo. */
  const summary = mirrorStore(
    createQuery(
      writable({
        queryKey: [...PARTS_QUERY_KEY, 'summary'],
        queryFn: () => partsApi.list({ page: 1, pageSize: MAX_PAGE_SIZE }),
      }),
    ),
  );

  return {
    /* `get` em vez de valor: o objeto é montado uma vez e a tela lê dele a cada mudança. */
    get data() {
      return {
        parts: list.current.data?.items ?? [],
        total: list.current.data?.total ?? 0,
        summary: summary.current.data ? summarizeParts(summary.current.data.items) : null,
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
      onCategoryChange: (category) => filterStore.update((current) => ({ ...current, category })),
      onConditionChange: (condition) =>
        filterStore.update((current) => ({ ...current, condition })),
      onInStockOnlyChange: (inStockOnly) =>
        filterStore.update((current) => ({ ...current, inStockOnly })),
      onClearFilters: () => filterStore.set({ ...EMPTY_FILTER }),
      onRetry: () => {
        void list.current.refetch();
        void summary.current.refetch();
      },
    },
  };
}

type PartPage = { items: Part[]; total: number } | undefined;

type ListQueryLike = {
  isPending: boolean;
  isSuccess: boolean;
  isRefetching: boolean;
  error: unknown;
  data: PartPage;
};

function hasAnyFilter(filter: PartListFilter): boolean {
  if (filter.search.trim() !== '') return true;

  return filter.category !== '' || filter.condition !== '' || filter.inStockOnly;
}

function buildListState(
  list: ListQueryLike,
  filter: PartListFilter,
): Omit<PartListModel['state'], 'isSummaryLoading'> {
  const count = list.data?.items.length ?? 0;
  /* Vazio só é vazio DEPOIS que a consulta terminou. Dizer "nenhuma peça" durante o
     carregamento faz a pessoa achar que o depósito sumiu — e recarregar. */
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
