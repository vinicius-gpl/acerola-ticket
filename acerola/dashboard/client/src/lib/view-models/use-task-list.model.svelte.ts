import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import {
  calculateTaskProgress,
  type TaskProgress,
  type TaskStatus,
} from '@template/shared/domain/task-status.util';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import { type Task } from '@template/shared/schemas/task.schema';

import { fromStore, toStore } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { tasksApi } from '$lib/api/tasks.api';

export type TaskListFilter = {
  search: string;
  status: TaskStatus | '';
};

export type TaskListModel = {
  data: {
    tasks: Task[];
    /** Quantas casaram com o filtro — pode ser mais do que as que vieram na página. */
    total: number;
    progress: TaskProgress;
    filter: TaskListFilter;
    /** A tarefa que está sendo confirmada para exclusão. */
    pendingDelete: Task | null;
  };
  state: {
    isLoading: boolean;
    isRefetching: boolean;
    /** Não existe tarefa nenhuma: o próximo passo é cadastrar. */
    isEmpty: boolean;
    /** Existem tarefas, mas o filtro escondeu todas: o próximo passo é limpar o filtro. */
    isFilteredOut: boolean;
    isTruncated: boolean;
    error: string | null;
    updatingTaskId: number | null;
    updateError: string | null;
    isDeleting: boolean;
    deleteError: string | null;
  };
  actions: {
    onSearchChange: (search: string) => void;
    onStatusChange: (status: TaskStatus | '') => void;
    onClearFilters: () => void;
    onRetry: () => void;
    onToggleDone: (task: Task) => void;
    onAskDelete: (task: Task) => void;
    onCancelDelete: () => void;
    onConfirmDelete: () => void;
  };
};

const EMPTY_FILTER: TaskListFilter = { search: '', status: '' };

export const TASKS_QUERY_KEY = ['tasks'] as const;

/**
 * Estado, consultas e handlers da lista de tarefas. ZERO JSX — a view recebe tudo por props e
 * não sabe de onde o dado veio (CONTRIBUTING §3).
 *
 * Abrir o formulário de criar/editar NÃO está aqui: ele tem o próprio view-model
 * (`use-task-form.model.ts`), e a rota compõe os dois.
 */
function scopeOf(filter: TaskListFilter) {
  return { search: filter.search.trim() || undefined, status: filter.status || undefined };
}

export function useTaskListModel(): TaskListModel {
  const queryClient = useQueryClient();

  let filter = $state<TaskListFilter>({ ...EMPTY_FILTER });
  let pendingDelete = $state<Task | null>(null);

  /* Esta versão do @tanstack/svelte-query fala em STORE, não em runes: as opções entram como
     store e o resultado sai como store. `toStore` publica o filtro pra consulta (trocar o
     filtro troca a queryKey e refaz a busca) e `fromStore` traz o resultado de volta pro
     mundo dos runes, onde `.current` é reativo. Quando a biblioteca migrar pra runes, some
     daqui essa ponte e nada mais muda. */
  const list = fromStore(
    createQuery(
      toStore(() => ({
        queryKey: [...TASKS_QUERY_KEY, 'list', scopeOf(filter)],
        queryFn: () => tasksApi.list({ ...scopeOf(filter), page: 1, pageSize: MAX_PAGE_SIZE }),
      })),
    ),
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });

  /* As mutações não precisam de `toStore`: as opções delas não mudam com o tempo. */
  const toggle = fromStore(
    createMutation({
      mutationFn: (task: Task) =>
        tasksApi.update(task.id, { status: task.status === 'done' ? 'todo' : 'done' }),
      onSuccess: invalidate,
    }),
  );

  const remove = fromStore(
    createMutation({
      mutationFn: (task: Task) => tasksApi.remove(task.id),
      onSuccess: async () => {
        pendingDelete = null;
        await invalidate();
      },
    }),
  );

  return {
    /* `get` em vez de valor: o objeto é montado uma vez e a tela lê dele a cada mudança. Com
       valores fixos, a lista congelaria no primeiro carregamento. */
    get data() {
      return buildData({ page: list.current.data, filter, pendingDelete });
    },
    get state() {
      return buildState({
        list: list.current,
        toggle: toggle.current,
        remove: remove.current,
        filter,
      });
    },
    actions: {
      onSearchChange: (search) => {
        filter = { ...filter, search };
      },
      onStatusChange: (status) => {
        filter = { ...filter, status };
      },
      onClearFilters: () => {
        filter = { ...EMPTY_FILTER };
      },
      onRetry: () => void list.current.refetch(),
      onToggleDone: (task) => toggle.current.mutate(task),
      onAskDelete: (task) => {
        remove.current.reset();
        pendingDelete = task;
      },
      /* Cancelar durante a exclusão não desfaz a requisição que já saiu — então não fecha. */
      onCancelDelete: () => {
        if (remove.current.isPending) return;
        pendingDelete = null;
      },
      onConfirmDelete: () => {
        if (!pendingDelete) return;
        remove.current.mutate(pendingDelete);
      },
    },
  };
}

type TaskPage = { items: Task[]; total: number } | undefined;

/**
 * `data` e `state` saem em funções próprias porque cada `??` conta como decisão — o hook
 * passava do teto de complexidade sem ter nenhuma decisão de verdade dentro. Separadas, elas
 * viram o que são: tradução de consulta para contrato de tela, sem regra escondida.
 */
function buildData(input: {
  page: TaskPage;
  filter: TaskListFilter;
  pendingDelete: Task | null;
}): TaskListModel['data'] {
  const tasks = input.page?.items ?? [];

  return {
    tasks,
    total: input.page?.total ?? 0,
    progress: calculateTaskProgress(tasks.map((task) => task.status)),
    filter: input.filter,
    pendingDelete: input.pendingDelete,
  };
}

type ListQueryLike = {
  isPending: boolean;
  isSuccess: boolean;
  isRefetching: boolean;
  error: unknown;
  data: TaskPage;
};

type MutationLike<TVariables> = { isPending: boolean; variables?: TVariables; error: unknown };

function buildState(input: {
  list: ListQueryLike;
  toggle: MutationLike<Task>;
  remove: MutationLike<Task>;
  filter: TaskListFilter;
}): TaskListModel['state'] {
  const { toggle, remove } = input;

  return {
    ...buildListState(input.list, input.filter),
    updatingTaskId: toggle.isPending ? (toggle.variables?.id ?? null) : null,
    updateError: readError(toggle.error),
    isDeleting: remove.isPending,
    deleteError: readError(remove.error),
  };
}

function buildListState(
  list: ListQueryLike,
  filter: TaskListFilter,
): Pick<
  TaskListModel['state'],
  'isLoading' | 'isRefetching' | 'isEmpty' | 'isFilteredOut' | 'isTruncated' | 'error'
> {
  const count = list.data?.items.length ?? 0;
  const hasFilter = filter.search.trim() !== '' || filter.status !== '';
  /* Vazio só é vazio DEPOIS que a consulta terminou. Mostrar "nenhuma tarefa" durante o
     carregamento faz a pessoa achar que os dados sumiram — e recarregar. */
  const isSettledEmpty = list.isSuccess && count === 0;

  return {
    isLoading: list.isPending,
    isRefetching: list.isRefetching,
    isEmpty: isSettledEmpty && !hasFilter,
    isFilteredOut: isSettledEmpty && hasFilter,
    /* Veio menos do que casou: a tela precisa dizer, nunca truncar calada. */
    isTruncated: (list.data?.total ?? 0) > count,
    error: readError(list.error),
  };
}
