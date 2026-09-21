<script lang="ts" module>
  import {
    TASK_STATUS_LABELS,
    TASK_STATUSES,
    type TaskProgress,
    type TaskStatus,
  } from '@template/shared/domain/task-status.util';
  import { type Task } from '@template/shared/schemas/task.schema';

  /**
   * A TELA DE TAREFAS — a feature de exemplo do template, e o molde de toda tela de lista.
   *
   * Função pura de props: nenhum hook de dado aqui (CONTRIBUTING §3). A ordem de retorno é a
   * mesma em toda tela, e é o early return da seção 2 aplicado ao template:
   *
   *   1. carregando → esqueleto (nunca "nenhum registro" enquanto carrega)
   *   2. erro → o motivo, em vermelho, com "tentar de novo"
   *   3. vazio de verdade → o próximo passo é cadastrar
   *   4. filtro escondeu tudo → o próximo passo é limpar o filtro
   *   5. a lista
   */
  export type TaskListViewProps = {
    data: {
      tasks: Task[];
      total: number;
      progress: TaskProgress;
      filter: { search: string; status: TaskStatus | '' };
    };
    state: {
      isLoading: boolean;
      isRefetching?: boolean;
      isEmpty: boolean;
      isFilteredOut: boolean;
      isTruncated?: boolean;
      error: string | null;
      updatingTaskId?: number | null;
      updateError?: string | null;
      canEdit?: boolean;
      canDelete?: boolean;
    };
    actions: {
      onCreate: () => void;
      onEdit: (task: Task) => void;
      onToggleDone: (task: Task) => void;
      onAskDelete: (task: Task) => void;
      onSearchChange: (search: string) => void;
      onStatusChange: (status: TaskStatus | '') => void;
      onClearFilters: () => void;
      onRetry: () => void;
    };
  };

  const STATUS_FILTER_OPTIONS = [
    { value: '', label: 'Todas as situações' },
    ...TASK_STATUSES.map((status) => ({ value: status, label: TASK_STATUS_LABELS[status] })),
  ];

  const SKELETON_ROWS = [0, 1, 2, 3];
</script>

<script lang="ts">
  import { taskStatusTone } from '@template/shared/domain/task-status.util';
  import Check from '@lucide/svelte/icons/check';
  import ListChecks from '@lucide/svelte/icons/list-checks';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Plus from '@lucide/svelte/icons/plus';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import SearchX from '@lucide/svelte/icons/search-x';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  import { cn } from '$lib/utils/cn.util';
  import { formatDateTime } from '$lib/utils/format-date.util';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import EmptyState from '$lib/components/empty-state/empty-state.svelte';
  import ErrorState from '$lib/components/error-state/error-state.svelte';
  import PageHeader from '$lib/components/page-header/page-header.svelte';
  import ProgressBar from '$lib/components/progress-bar/progress-bar.svelte';
  import SelectField from '$lib/components/select-field/select-field.svelte';
  import StatusBadge from '$lib/components/status-badge/status-badge.svelte';
  import TextField from '$lib/components/text-field/text-field.svelte';

  let { data, state, actions }: TaskListViewProps = $props();

  const canEdit = $derived(state.canEdit ?? true);
</script>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pb-10 sm:px-6">
  <PageHeader data={{ title: 'Tarefas', description: 'O que precisa ser feito, e em que pé está.' }}>
    {#if canEdit}
      <ActionButton
        data={{ label: 'Nova tarefa' }}
        ui={{ icon: Plus }}
        actions={{ onClick: actions.onCreate }}
      />
    {/if}
  </PageHeader>

  <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
    <TextField
      data={{
        label: 'Buscar',
        name: 'search',
        value: data.filter.search,
        placeholder: 'Título ou descrição',
      }}
      ui={{ className: 'flex-1' }}
      actions={{ onChange: actions.onSearchChange }}
    />
    <div class="sm:w-56">
      <SelectField
        data={{ value: data.filter.status, options: STATUS_FILTER_OPTIONS }}
        ui={{
          ariaLabel: 'Situação',
          placeholder: 'Todas as situações',
          className: 'w-full bg-card',
        }}
        actions={{ onChange: (value: string) => actions.onStatusChange(value as TaskStatus | '') }}
      />
    </div>
  </div>

  {#if state.updateError}
    <ErrorState data={{ message: state.updateError }} ui={{ variant: 'inline' }} />
  {/if}

  {#if state.isLoading}
    <div class="flex flex-col gap-2" aria-busy="true" aria-label="Carregando tarefas">
      {#each SKELETON_ROWS as row (row)}
        <div class="border-ink-300 bg-card rounded-lg border p-4">
          <Skeleton class="h-4 w-2/3" />
          <Skeleton class="mt-2 h-3 w-1/3" />
        </div>
      {/each}
    </div>
  {:else if state.error}
    <ErrorState
      data={{ title: 'A lista de tarefas não carregou', message: state.error }}
      state={{ isRetrying: state.isRefetching }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if state.isEmpty}
    <EmptyState
      data={{
        title: 'Nenhuma tarefa ainda',
        description: 'Cadastre a primeira para começar a acompanhar o trabalho.',
      }}
      ui={{ icon: ListChecks }}
    >
      <ActionButton
        data={{ label: 'Nova tarefa' }}
        ui={{ icon: Plus }}
        actions={{ onClick: actions.onCreate }}
      />
    </EmptyState>
  {:else if state.isFilteredOut}
    <EmptyState
      data={{
        title: 'Nenhuma tarefa encontrada',
        description: 'Nada combina com a busca ou a situação escolhida.',
      }}
      ui={{ icon: SearchX }}
    >
      <ActionButton
        data={{ label: 'Limpar filtros' }}
        ui={{ variant: 'secondary' }}
        actions={{ onClick: actions.onClearFilters }}
      />
    </EmptyState>
  {:else}
    <section class="flex flex-col gap-3" aria-label="Lista de tarefas">
      <div class="text-ink-500 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>
          {data.tasks.length} de {data.total} {data.total === 1 ? 'tarefa' : 'tarefas'}
        </span>
        <ProgressBar data={data.progress} ui={{ itemLabel: 'tarefas', className: 'w-56' }} />
      </div>

      {#if state.isTruncated}
        <p class="text-xs text-amber-700">
          Mostrando só as primeiras {data.tasks.length}. Use a busca para achar as outras.
        </p>
      {/if}

      <ul class="flex flex-col gap-2">
        {#each data.tasks as task (task.id)}
          {@const isDone = task.status === 'done'}
          <li class="border-ink-300 bg-card flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <p class={cn('text-ink-900 font-semibold break-words', isDone && 'text-ink-500 line-through')}>
                  {task.title}
                </p>
                <StatusBadge
                  data={{ label: TASK_STATUS_LABELS[task.status] }}
                  ui={{ tone: taskStatusTone(task.status), size: 'sm' }}
                />
              </div>
              {#if task.description}
                <p class="text-ink-700 mt-1 text-sm break-words whitespace-pre-line">
                  {task.description}
                </p>
              {/if}
              <p class="text-ink-500 mt-2 text-xs">
                Criada em {formatDateTime(task.createdAt)} por {task.createdBy}
              </p>
            </div>

            {#if canEdit}
              <div class="flex shrink-0 gap-1">
                <ActionButton
                  data={{ label: isDone ? 'Reabrir tarefa' : 'Marcar como concluída' }}
                  ui={{
                    icon: isDone ? RotateCcw : Check,
                    isIconOnly: true,
                    variant: 'ghost',
                    size: 'sm',
                  }}
                  state={{ isLoading: state.updatingTaskId === task.id }}
                  actions={{ onClick: () => actions.onToggleDone(task) }}
                />
                <ActionButton
                  data={{ label: 'Editar tarefa' }}
                  ui={{ icon: Pencil, isIconOnly: true, variant: 'ghost', size: 'sm' }}
                  actions={{ onClick: () => actions.onEdit(task) }}
                />
                {#if state.canDelete ?? true}
                  <ActionButton
                    data={{ label: 'Excluir tarefa' }}
                    ui={{
                      icon: Trash2,
                      isIconOnly: true,
                      variant: 'ghost',
                      size: 'sm',
                      className: 'text-red-600 hover:text-red-700',
                    }}
                    actions={{ onClick: () => actions.onAskDelete(task) }}
                  />
                {/if}
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>
