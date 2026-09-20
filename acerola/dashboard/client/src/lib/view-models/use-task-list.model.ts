import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  calculateTaskProgress,
  type TaskProgress,
  type TaskStatus,
} from '@template/shared/domain/task-status.util';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import { type Task } from '@template/shared/schemas/task.schema';
import { useState } from 'react';

import { readError } from '../api/http-client';
import { tasksApi } from '../api/tasks.api';

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
export function useTaskListModel(): TaskListModel {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<TaskListFilter>(EMPTY_FILTER);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);

  const scope = { search: filter.search.trim() || undefined, status: filter.status || undefined };

  const list = useQuery({
    queryKey: [...TASKS_QUERY_KEY, 'list', scope],
    queryFn: () => tasksApi.list({ ...scope, page: 1, pageSize: MAX_PAGE_SIZE }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });

  const toggle = useMutation({
    mutationFn: (task: Task) =>
      tasksApi.update(task.id, { status: task.status === 'done' ? 'todo' : 'done' }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (task: Task) => tasksApi.remove(task.id),
    onSuccess: async () => {
      setPendingDelete(null);
      await invalidate();
    },
  });

  return {
    data: buildData({ page: list.data, filter, pendingDelete }),
    state: buildState({ list, toggle, remove, filter }),
    actions: {
      onSearchChange: (search) => setFilter((current) => ({ ...current, search })),
      onStatusChange: (status) => setFilter((current) => ({ ...current, status })),
      onClearFilters: () => setFilter(EMPTY_FILTER),
      onRetry: () => void list.refetch(),
      onToggleDone: (task) => toggle.mutate(task),
      onAskDelete: (task) => {
        remove.reset();
        setPendingDelete(task);
      },
      /* Cancelar durante a exclusão não desfaz a requisição que já saiu — então não fecha. */
      onCancelDelete: () => {
        if (remove.isPending) return;
        setPendingDelete(null);
      },
      onConfirmDelete: () => {
        if (!pendingDelete) return;
        remove.mutate(pendingDelete);
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
