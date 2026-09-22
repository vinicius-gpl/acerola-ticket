import { createQuery } from '@tanstack/svelte-query';
import {
  type TicketDepartment,
  type TicketProblemType,
} from '@template/shared/domain/ticket-catalog.util';
import {
  type TicketPriority,
  type TicketStatus,
} from '@template/shared/domain/ticket-status.util';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import { type Ticket } from '@template/shared/schemas/ticket.schema';
import { derived, writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { ticketsApi, type TicketDashboard } from '$lib/api/tickets.api';
import { mirrorStore } from '$lib/hooks/mirror-store/mirror-store.svelte';

export type TicketListFilter = {
  search: string;
  status: TicketStatus | '';
  priority: TicketPriority | '';
  department: TicketDepartment | '';
  problemType: TicketProblemType | '';
};

export type TicketListModel = {
  data: {
    tickets: Ticket[];
    /** Quantos casaram com o filtro — pode ser mais do que os que vieram na página. */
    total: number;
    /** Os indicadores, sobre TODOS os chamados: eles não seguem o filtro da lista. */
    dashboard: TicketDashboard | null;
    filter: TicketListFilter;
  };
  state: {
    isLoading: boolean;
    isRefetching: boolean;
    /** Não existe chamado nenhum: nada a fazer ainda. */
    isEmpty: boolean;
    /** Existem chamados, mas o filtro escondeu todos: o próximo passo é limpar o filtro. */
    isFilteredOut: boolean;
    isTruncated: boolean;
    isDashboardLoading: boolean;
    error: string | null;
  };
  actions: {
    onSearchChange: (search: string) => void;
    onStatusChange: (status: TicketStatus | '') => void;
    onPriorityChange: (priority: TicketPriority | '') => void;
    onDepartmentChange: (department: TicketDepartment | '') => void;
    onProblemTypeChange: (problemType: TicketProblemType | '') => void;
    onClearFilters: () => void;
    onRetry: () => void;
  };
};

const EMPTY_FILTER: TicketListFilter = {
  search: '',
  status: '',
  priority: '',
  department: '',
  problemType: '',
};

export const TICKETS_QUERY_KEY = ['tickets'] as const;

function scopeOf(filter: TicketListFilter) {
  return {
    search: filter.search.trim() || undefined,
    status: filter.status || undefined,
    priority: filter.priority || undefined,
    department: filter.department || undefined,
    problemType: filter.problemType || undefined,
  };
}

/**
 * Estado, consultas e handlers da fila de chamados do painel. ZERO marcação — a view recebe
 * tudo por props e não sabe de onde o dado veio (CONTRIBUTING §3).
 *
 * Atender um chamado NÃO está aqui: tem o próprio view-model (`use-ticket-answer`), e a rota
 * compõe os dois.
 */
export function useTicketListModel(): TicketListModel {
  /* O filtro mora numa STORE, e não num `$state`: esta versão do @tanstack/svelte-query
     recebe as opções como store e é ela quem decide quando refazer a busca. Com `$state`,
     duas mudanças seguidas de filtro chegariam à consulta como uma emissão só, com o valor
     do meio — e a API seria chamada sem um dos filtros. */
  const filterStore = writable<TicketListFilter>({ ...EMPTY_FILTER });
  const filter = mirrorStore(filterStore);

  const list = mirrorStore(
    createQuery(
      derived(filterStore, (current) => ({
        queryKey: [...TICKETS_QUERY_KEY, 'list', scopeOf(current)],
        queryFn: () => ticketsApi.list({ ...scopeOf(current), page: 1, pageSize: MAX_PAGE_SIZE }),
      })),
    ),
  );

  /* Os indicadores NÃO recebem o filtro: "quanto tempo levamos para resolver" é uma pergunta
     sobre o atendimento inteiro. Recalculá-los a cada filtro faria o número mudar enquanto a
     pessoa procura um chamado, como se o desempenho do time dependesse da busca. */
  const dashboard = mirrorStore(
    createQuery(
      writable({
        queryKey: [...TICKETS_QUERY_KEY, 'dashboard'],
        queryFn: () => ticketsApi.dashboard(),
      }),
    ),
  );

  return {
    /* `get` em vez de valor: o objeto é montado uma vez e a tela lê dele a cada mudança. Com
       valores fixos, a lista congelaria no primeiro carregamento. */
    get data() {
      return buildData({
        page: list.current.data,
        dashboard: dashboard.current.data ?? null,
        filter: filter.current,
      });
    },
    get state() {
      return {
        ...buildListState(list.current, filter.current),
        isDashboardLoading: dashboard.current.isPending,
      };
    },
    actions: {
      onSearchChange: (search) => filterStore.update((current) => ({ ...current, search })),
      onStatusChange: (status) => filterStore.update((current) => ({ ...current, status })),
      onPriorityChange: (priority) => filterStore.update((current) => ({ ...current, priority })),
      onDepartmentChange: (department) =>
        filterStore.update((current) => ({ ...current, department })),
      onProblemTypeChange: (problemType) =>
        filterStore.update((current) => ({ ...current, problemType })),
      onClearFilters: () => filterStore.set({ ...EMPTY_FILTER }),
      onRetry: () => {
        void list.current.refetch();
        void dashboard.current.refetch();
      },
    },
  };
}

type TicketPage = { items: Ticket[]; total: number } | undefined;

/**
 * `data` e `state` saem em funções próprias porque cada `??` conta como decisão — o hook
 * passava do teto de complexidade sem ter nenhuma decisão de verdade dentro.
 */
function buildData(input: {
  page: TicketPage;
  dashboard: TicketDashboard | null;
  filter: TicketListFilter;
}): TicketListModel['data'] {
  return {
    tickets: input.page?.items ?? [],
    total: input.page?.total ?? 0,
    dashboard: input.dashboard,
    filter: input.filter,
  };
}

type ListQueryLike = {
  isPending: boolean;
  isSuccess: boolean;
  isRefetching: boolean;
  error: unknown;
  data: TicketPage;
};

function hasAnyFilter(filter: TicketListFilter): boolean {
  if (filter.search.trim() !== '') return true;

  return (
    filter.status !== '' ||
    filter.priority !== '' ||
    filter.department !== '' ||
    filter.problemType !== ''
  );
}

function buildListState(
  list: ListQueryLike,
  filter: TicketListFilter,
): Omit<TicketListModel['state'], 'isDashboardLoading'> {
  const count = list.data?.items.length ?? 0;
  /* Vazio só é vazio DEPOIS que a consulta terminou. Mostrar "nenhum chamado" durante o
     carregamento faz a pessoa achar que os dados sumiram — e recarregar. */
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
