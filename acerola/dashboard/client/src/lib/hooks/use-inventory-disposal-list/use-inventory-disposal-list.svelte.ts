import { createQuery } from '@tanstack/svelte-query';
import { type DisposalReason } from '@template/shared/domain/inventory-stock.util';
import { type InventoryMovement } from '@template/shared/schemas/inventory-movement.schema';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import { writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { inventoryItemsApi } from '$lib/api/inventory-items.api';
import { INVENTORY_QUERY_KEY } from '$lib/hooks/use-inventory-list/use-inventory-list.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';

export type InventoryDisposalFilter = { reason: DisposalReason | '' };

export type InventoryDisposalListModel = {
  data: {
    disposals: InventoryMovement[];
    total: number;
    /** Quantas UNIDADES somam os descartes à vista — a soma das quantidades, não das linhas. */
    units: number;
    filter: InventoryDisposalFilter;
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
    onReasonChange: (reason: DisposalReason | '') => void;
    onClearFilters: () => void;
    onRetry: () => void;
  };
};

/**
 * O que a lista mostra depois do filtro de motivo.
 *
 * Aplicado AQUI, e não no servidor: a consulta já traz os descartes, então separar por motivo
 * não precisa de outra ida ao servidor. Exportado e puro para ter teste.
 */
export function disposalsOf(
  disposals: readonly InventoryMovement[],
  filter: InventoryDisposalFilter,
): InventoryMovement[] {
  if (filter.reason === '') return [...disposals];

  return disposals.filter((disposal) => disposal.reason === filter.reason);
}

/**
 * Estado, consulta e handlers do DESCARTE da Manutenção: o que saiu de uso, e por quê.
 *
 * Descarte é um movimento do depósito com um motivo a mais — por isso a lista vem do mesmo
 * extrato, filtrado pelo tipo, e mora debaixo da mesma chave de consulta do inventário:
 * registrar um descarte muda o saldo do produto, e as três telas recarregam juntas.
 *
 * Registrar NÃO está aqui: o formulário tem view-model próprio
 * (`use-inventory-movement-form`), porque morre com o diálogo que o abriu.
 */
export function useInventoryDisposalListModel(): InventoryDisposalListModel {
  let filter = $state<InventoryDisposalFilter>({ reason: '' });

  const list = mirrorStore(
    createQuery(
      writable({
        queryKey: [...INVENTORY_QUERY_KEY, 'movements', 'disposal'],
        queryFn: () =>
          inventoryItemsApi.movements({ type: 'disposal', page: 1, pageSize: MAX_PAGE_SIZE }),
      }),
    ),
  );

  return {
    /* `get` em vez de valor: o objeto é montado uma vez e a tela lê dele a cada mudança. */
    get data() {
      const disposals = disposalsOf(list.current.data?.items ?? [], filter);

      return {
        disposals,
        /* Com um motivo escolhido, o total é o do que sobrou do filtro, não o do servidor. */
        total: filter.reason === '' ? (list.current.data?.total ?? 0) : disposals.length,
        units: disposals.reduce((sum, disposal) => sum + disposal.quantity, 0),
        filter,
      };
    },
    get state() {
      const loaded = list.current.data?.items ?? [];
      /* Vazio só é vazio DEPOIS que a consulta terminou. */
      const isSettledEmpty = list.current.isSuccess && disposalsOf(loaded, filter).length === 0;
      const filtered = filter.reason !== '';

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
      onReasonChange: (reason) => {
        filter = { reason };
      },
      onClearFilters: () => {
        filter = { reason: '' };
      },
      onRetry: () => {
        void list.current.refetch();
      },
    },
  };
}
