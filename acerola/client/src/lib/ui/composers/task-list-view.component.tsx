import {
  TASK_STATUS_LABELS,
  TASK_STATUSES,
  type TaskProgress,
  type TaskStatus,
  taskStatusTone,
} from '@template/shared/domain/task-status.util';
import { type Task } from '@template/shared/schemas/task.schema';
import { Check, ListChecks, Pencil, Plus, RotateCcw, SearchX, Trash2 } from 'lucide-react';

import { cn } from '../../utils/cn.util';
import { formatDateTime } from '../../utils/format-date.util';
import { Skeleton } from '../../vendor/ui/skeleton';
import { ActionButton } from '../primitives/action-button.component';
import { EmptyState } from '../primitives/empty-state.component';
import { ErrorState } from '../primitives/error-state.component';
import { PageHeader } from '../primitives/page-header.component';
import { ProgressBar } from '../primitives/progress-bar.component';
import { SelectField } from '../primitives/select-field.component';
import { StatusBadge } from '../primitives/status-badge.component';
import { TextField } from '../primitives/text-field.component';

/**
 * A TELA DE TAREFAS — a feature de exemplo do template, e o molde de toda tela de lista.
 *
 * Função pura de props: nenhum hook de dado aqui (CONTRIBUTING §3). A ordem de retorno é a
 * mesma em toda tela, e é o early return da seção 2 aplicado ao JSX:
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

export function TaskListView({ data, state, actions }: TaskListViewProps) {
  const canEdit = state.canEdit ?? true;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pb-10 sm:px-6">
      <PageHeader
        data={{ title: 'Tarefas', description: 'O que precisa ser feito, e em que pé está.' }}
      >
        {canEdit ? (
          <ActionButton
            data={{ label: 'Nova tarefa' }}
            ui={{ icon: Plus }}
            actions={{ onClick: actions.onCreate }}
          />
        ) : null}
      </PageHeader>

      <FilterBar data={data} actions={actions} />

      {state.updateError ? (
        <ErrorState data={{ message: state.updateError }} ui={{ variant: 'inline' }} />
      ) : null}

      <TaskListBody data={data} state={state} actions={actions} />
    </div>
  );
}

function FilterBar({
  data,
  actions,
}: Pick<TaskListViewProps, 'data'> & { actions: TaskListViewProps['actions'] }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
      <div className="sm:w-56">
        <SelectField
          data={{ value: data.filter.status, options: STATUS_FILTER_OPTIONS }}
          ui={{
            ariaLabel: 'Situação',
            placeholder: 'Todas as situações',
            className: 'w-full bg-card',
          }}
          actions={{ onChange: (value) => actions.onStatusChange(value as TaskStatus | '') }}
        />
      </div>
    </div>
  );
}

function TaskListBody({ data, state, actions }: TaskListViewProps) {
  if (state.isLoading) return <TaskListSkeleton />;

  if (state.error) {
    return (
      <ErrorState
        data={{ title: 'A lista de tarefas não carregou', message: state.error }}
        state={{ isRetrying: state.isRefetching }}
        actions={{ onRetry: actions.onRetry }}
      />
    );
  }

  if (state.isEmpty) {
    return (
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
    );
  }

  if (state.isFilteredOut) {
    return (
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
    );
  }

  return (
    <section className="flex flex-col gap-3" aria-label="Lista de tarefas">
      <div className="text-ink-500 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>
          {data.tasks.length} de {data.total} {data.total === 1 ? 'tarefa' : 'tarefas'}
        </span>
        <ProgressBar data={data.progress} ui={{ itemLabel: 'tarefas', className: 'w-56' }} />
      </div>

      {state.isTruncated ? (
        <p className="text-xs text-amber-700">
          Mostrando só as primeiras {data.tasks.length}. Use a busca para achar as outras.
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {data.tasks.map((task) => (
          <TaskItem key={task.id} data={{ task }} state={state} actions={actions} />
        ))}
      </ul>
    </section>
  );
}

function TaskItem({
  data,
  state,
  actions,
}: {
  data: { task: Task };
  state: TaskListViewProps['state'];
  actions: TaskListViewProps['actions'];
}) {
  const { task } = data;
  const isDone = task.status === 'done';
  const canEdit = state.canEdit ?? true;

  return (
    <li className="border-ink-300 bg-card flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={cn(
              'text-ink-900 font-semibold break-words',
              isDone && 'text-ink-500 line-through',
            )}
          >
            {task.title}
          </p>
          <StatusBadge
            data={{ label: TASK_STATUS_LABELS[task.status] }}
            ui={{ tone: taskStatusTone(task.status), size: 'sm' }}
          />
        </div>
        {task.description ? (
          <p className="text-ink-700 mt-1 text-sm break-words whitespace-pre-line">
            {task.description}
          </p>
        ) : null}
        <p className="text-ink-500 mt-2 text-xs">
          Criada em {formatDateTime(task.createdAt)} por {task.createdBy}
        </p>
      </div>

      {canEdit ? (
        <div className="flex shrink-0 gap-1">
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
          {(state.canDelete ?? true) ? (
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
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

/** O esqueleto tem a FORMA da lista: sem isso, a tela pula quando o conteúdo chega. */
function TaskListSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Carregando tarefas">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="border-ink-300 bg-card rounded-lg border p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-2 h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}
