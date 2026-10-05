import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { type InventoryCategory } from '@template/shared/domain/inventory-catalog.util';
import { type InventoryItem } from '@template/shared/schemas/inventory-item.schema';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import { derived, writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { inventoryItemsApi } from '$lib/api/inventory-items.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';

export type InventoryListFilter = {
  search: string;
  category: InventoryCategory | '';
  /** Só o que ainda não tem foto — é por aqui que ela termina o cadastro aos poucos. */
  withoutPhotoOnly: boolean;
};

export type InventoryListModel = {
  data: {
    items: InventoryItem[];
    total: number;
    filter: InventoryListFilter;
    /** O produto que está esperando confirmação de exclusão — nulo quando não há. */
    deleting: InventoryItem | null;
  };
  state: {
    isLoading: boolean;
    isRefetching: boolean;
    isEmpty: boolean;
    isFilteredOut: boolean;
    isTruncated: boolean;
    isDeleting: boolean;
    error: string | null;
    deleteError: string | null;
  };
  actions: {
    onSearchChange: (search: string) => void;
    onCategoryChange: (category: InventoryCategory | '') => void;
    onWithoutPhotoOnlyChange: (withoutPhotoOnly: boolean) => void;
    onClearFilters: () => void;
    onRetry: () => void;
    onAskDelete: (item: InventoryItem) => void;
    onCancelDelete: () => void;
    onConfirmDelete: () => void;
  };
};

const EMPTY_FILTER: InventoryListFilter = { search: '', category: '', withoutPhotoOnly: false };

export const INVENTORY_QUERY_KEY = ['inventory-items'] as const;

function scopeOf(filter: InventoryListFilter) {
  return {
    search: filter.search.trim() || undefined,
    category: filter.category || undefined,
  };
}

/**
 * O que a lista mostra depois do filtro de "sem foto".
 *
 * Aplicado AQUI, e não no servidor: a consulta já traz a lista inteira, então separar o que
 * está sem imagem não precisa de outra ida ao servidor. Exportado e puro para ter teste.
 */
export function visibleItemsOf(
  items: readonly InventoryItem[],
  filter: InventoryListFilter,
): InventoryItem[] {
  if (!filter.withoutPhotoOnly) return [...items];

  return items.filter((item) => item.photoUrl === null);
}

/**
 * Estado, consultas e handlers do inventário da Manutenção. ZERO marcação — a view recebe
 * tudo por props e não sabe de onde o dado veio (CONTRIBUTING §3).
 *
 * Cadastrar e alterar NÃO estão aqui: o formulário tem view-model próprio, porque formulário
 * morre junto com o diálogo que o abriu. A EXCLUSÃO está, porque ela nasce na lista — e por
 * isso o produto que espera confirmação também mora aqui.
 */
export function useInventoryListModel(): InventoryListModel {
  const queryClient = useQueryClient();

  /* O filtro mora numa STORE, e não num `$state`: esta versão do @tanstack/svelte-query
     recebe as opções como store e é ela quem decide quando refazer a busca. */
  const filterStore = writable<InventoryListFilter>({ ...EMPTY_FILTER });
  const filter = mirrorStore(filterStore);

  let deleting = $state<InventoryItem | null>(null);
  let deleteError = $state<string | null>(null);

  const list = mirrorStore(
    createQuery(
      derived(filterStore, (current) => ({
        queryKey: [...INVENTORY_QUERY_KEY, 'list', scopeOf(current)],
        queryFn: () =>
          inventoryItemsApi.list({ ...scopeOf(current), page: 1, pageSize: MAX_PAGE_SIZE }),
      })),
    ),
  );

  const remove = mirrorStore(
    createMutation(
      writable({
        mutationFn: (id: number) => inventoryItemsApi.remove(id),
        onSuccess: () => {
          deleting = null;
          deleteError = null;
          void queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
        },
        /* A falha fica NA TELA, com o motivo, até a pessoa resolver (CONTRIBUTING §15): o
           diálogo não fecha sozinho fingindo que excluiu. */
        onError: (error: unknown) => {
          deleteError = readError(error);
        },
      }),
    ),
  );

  return {
    /* `get` em vez de valor: o objeto é montado uma vez e a tela lê dele a cada mudança. */
    get data() {
      const items = visibleItemsOf(list.current.data?.items ?? [], filter.current);

      return {
        items,
        /* Com "sem foto" ligado, o total é o do que sobrou do filtro, não o do servidor. */
        total: filter.current.withoutPhotoOnly ? items.length : (list.current.data?.total ?? 0),
        filter: filter.current,
        deleting,
      };
    },
    get state() {
      const visibleCount = visibleItemsOf(list.current.data?.items ?? [], filter.current).length;

      return {
        ...buildListState(list.current, filter.current, visibleCount),
        isDeleting: remove.current.isPending,
        deleteError,
      };
    },
    actions: {
      onSearchChange: (search) => filterStore.update((current) => ({ ...current, search })),
      onCategoryChange: (category) => filterStore.update((current) => ({ ...current, category })),
      onWithoutPhotoOnlyChange: (withoutPhotoOnly) =>
        filterStore.update((current) => ({ ...current, withoutPhotoOnly })),
      onClearFilters: () => filterStore.set({ ...EMPTY_FILTER }),
      onRetry: () => {
        void list.current.refetch();
      },
      onAskDelete: (item) => {
        deleting = item;
        deleteError = null;
      },
      onCancelDelete: () => {
        deleting = null;
        deleteError = null;
      },
      /* `mutate`, e não `await mutateAsync`: quem cuida do erro é o `onError` acima, e um
         `await` aqui exigiria try/catch em quem chama só para não derrubar a tela. */
      onConfirmDelete: () => {
        if (!deleting) return;

        remove.current.mutate(deleting.id);
      },
    },
  };
}

type InventoryPage = { items: InventoryItem[]; total: number } | undefined;

type ListQueryLike = {
  isPending: boolean;
  isSuccess: boolean;
  isRefetching: boolean;
  error: unknown;
  data: InventoryPage;
};

function hasAnyFilter(filter: InventoryListFilter): boolean {
  if (filter.search.trim() !== '') return true;
  if (filter.withoutPhotoOnly) return true;

  return filter.category !== '';
}

function buildListState(
  list: ListQueryLike,
  filter: InventoryListFilter,
  visibleCount: number,
): Omit<InventoryListModel['state'], 'isDeleting' | 'deleteError'> {
  const count = list.data?.items.length ?? 0;
  /* Vazio só é vazio DEPOIS que a consulta terminou. Dizer "nenhum produto" durante o
     carregamento faz a pessoa achar que o inventário sumiu — e recarregar. */
  const isSettledEmpty = list.isSuccess && visibleCount === 0;
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
