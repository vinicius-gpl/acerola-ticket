import { createQuery } from '@tanstack/svelte-query';
import { type InventoryCategory } from '@template/shared/domain/inventory-catalog.util';
import { type InventoryItem } from '@template/shared/schemas/inventory-item.schema';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import { derived, writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { inventoryItemsApi } from '$lib/api/inventory-items.api';
import { INVENTORY_QUERY_KEY } from '$lib/hooks/use-inventory-list/use-inventory-list.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';

export type InventoryStockFilter = {
  search: string;
  category: InventoryCategory | '';
  /** Só o que zerou — é a lista de compras da semana. */
  outOfStockOnly: boolean;
};

export type InventoryStockModel = {
  data: {
    items: InventoryItem[];
    total: number;
    /** Quantos produtos da lista estão zerados — o número do atalho "Sem estoque". */
    outOfStock: number;
    filter: InventoryStockFilter;
  };
  state: {
    isLoading: boolean;
    isRefetching: boolean;
    isEmpty: boolean;
    isFilteredOut: boolean;
    isTruncated: boolean;
    error: string | null;
  };
  actions: {
    onSearchChange: (search: string) => void;
    onCategoryChange: (category: InventoryCategory | '') => void;
    onOutOfStockOnlyChange: (outOfStockOnly: boolean) => void;
    onClearFilters: () => void;
    onRetry: () => void;
  };
};

const EMPTY_FILTER: InventoryStockFilter = { search: '', category: '', outOfStockOnly: false };

function scopeOf(filter: InventoryStockFilter) {
  return {
    search: filter.search.trim() || undefined,
    category: filter.category || undefined,
  };
}

/**
 * O que a lista mostra depois do filtro de "sem estoque".
 *
 * Aplicado AQUI, e não no servidor: a consulta já traz a lista inteira, então separar o que
 * zerou não precisa de outra ida ao servidor. Exportado e puro para ter teste.
 */
export function stockItemsOf(
  items: readonly InventoryItem[],
  filter: InventoryStockFilter,
): InventoryItem[] {
  if (!filter.outOfStockOnly) return [...items];

  return items.filter((item) => item.balance === 0);
}

/**
 * Estado, consulta e handlers do DEPÓSITO da Manutenção: os mesmos produtos do inventário,
 * lidos pelo que importa aqui — quanto há de cada um.
 *
 * Usa a MESMA chave de consulta do inventário de propósito: é a mesma lista, e registrar uma
 * entrada precisa atualizar as duas telas. Movimentar NÃO está aqui: o formulário tem
 * view-model próprio (`use-inventory-movement-form`), porque morre com o diálogo que o abriu.
 */
export function useInventoryStockModel(): InventoryStockModel {
  /* O filtro mora numa STORE, e não num `$state`: esta versão do @tanstack/svelte-query
     recebe as opções como store e é ela quem decide quando refazer a busca. */
  const filterStore = writable<InventoryStockFilter>({ ...EMPTY_FILTER });
  const filter = mirrorStore(filterStore);

  const list = mirrorStore(
    createQuery(
      derived(filterStore, (current) => ({
        queryKey: [...INVENTORY_QUERY_KEY, 'list', scopeOf(current)],
        queryFn: () =>
          inventoryItemsApi.list({ ...scopeOf(current), page: 1, pageSize: MAX_PAGE_SIZE }),
      })),
    ),
  );

  return {
    /* `get` em vez de valor: o objeto é montado uma vez e a tela lê dele a cada mudança. */
    get data() {
      const all = list.current.data?.items ?? [];
      const items = stockItemsOf(all, filter.current);

      return {
        items,
        /* Com "sem estoque" ligado, o total é o do que sobrou do filtro, não o do servidor. */
        total: filter.current.outOfStockOnly ? items.length : (list.current.data?.total ?? 0),
        outOfStock: all.filter((item) => item.balance === 0).length,
        filter: filter.current,
      };
    },
    get state() {
      const loaded = list.current.data?.items ?? [];
      const visibleCount = stockItemsOf(loaded, filter.current).length;
      /* Vazio só é vazio DEPOIS que a consulta terminou. */
      const isSettledEmpty = list.current.isSuccess && visibleCount === 0;
      const filtered = hasAnyFilter(filter.current);

      return {
        isLoading: list.current.isPending,
        isRefetching: list.current.isRefetching,
        isEmpty: isSettledEmpty && !filtered,
        isFilteredOut: isSettledEmpty && filtered,
        /* Veio menos do que casou: a tela precisa dizer, nunca truncar calada. */
        isTruncated: (list.current.data?.total ?? 0) > loaded.length,
        error: readError(list.current.error),
      };
    },
    actions: {
      onSearchChange: (search) => filterStore.update((current) => ({ ...current, search })),
      onCategoryChange: (category) => filterStore.update((current) => ({ ...current, category })),
      onOutOfStockOnlyChange: (outOfStockOnly) =>
        filterStore.update((current) => ({ ...current, outOfStockOnly })),
      onClearFilters: () => filterStore.set({ ...EMPTY_FILTER }),
      onRetry: () => {
        void list.current.refetch();
      },
    },
  };
}

function hasAnyFilter(filter: InventoryStockFilter): boolean {
  if (filter.search.trim() !== '') return true;
  if (filter.outOfStockOnly) return true;

  return filter.category !== '';
}
