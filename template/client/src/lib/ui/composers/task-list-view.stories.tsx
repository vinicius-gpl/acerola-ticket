import { type Meta, type StoryObj } from '@storybook/react';
import { type Task } from '@template/shared/schemas/task.schema';
import { fn } from 'storybook/test';

import { TaskListView } from './task-list-view.component';

function task(overrides: Partial<Task>): Task {
  return {
    id: 1,
    title: 'Ligar para o cliente',
    description: null,
    status: 'todo',
    createdAt: '2026-09-14T12:00:00.000Z',
    createdBy: 'ana@empresa.com.br',
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

const tasks: Task[] = [
  task({
    id: 1,
    title: 'Ligar para o cliente',
    description: 'Confirmar o horário da visita.',
    status: 'doing',
  }),
  task({ id: 2, title: 'Revisar contrato', status: 'todo' }),
  task({ id: 3, title: 'Enviar proposta', status: 'done' }),
];

const idleState = {
  isLoading: false,
  isEmpty: false,
  isFilteredOut: false,
  error: null,
};

const meta = {
  title: 'Composers/TaskListView',
  component: TaskListView,
  parameters: { layout: 'fullscreen' },
  args: {
    data: {
      tasks,
      total: 3,
      progress: { percentage: 33, done: 1, total: 3 },
      filter: { search: '', status: '' },
    },
    state: idleState,
    actions: {
      onCreate: fn(),
      onEdit: fn(),
      onToggleDone: fn(),
      onAskDelete: fn(),
      onSearchChange: fn(),
      onStatusChange: fn(),
      onClearFilters: fn(),
      onRetry: fn(),
    },
  },
} satisfies Meta<typeof TaskListView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  args: { state: { ...idleState, isLoading: true } },
};

export const LoadFailed: Story = {
  args: {
    state: {
      ...idleState,
      error: 'Não consegui falar com o servidor. Confira se ele está rodando e tente de novo.',
    },
  },
};

/** Não existe tarefa nenhuma: o próximo passo é cadastrar. */
export const Empty: Story = {
  args: {
    data: {
      tasks: [],
      total: 0,
      progress: { percentage: 0, done: 0, total: 0 },
      filter: { search: '', status: '' },
    },
    state: { ...idleState, isEmpty: true },
  },
};

/** O filtro escondeu tudo: o próximo passo é limpar o filtro, não cadastrar. */
export const FilteredOut: Story = {
  args: {
    data: {
      tasks: [],
      total: 0,
      progress: { percentage: 0, done: 0, total: 0 },
      filter: { search: 'xyz', status: 'done' },
    },
    state: { ...idleState, isFilteredOut: true },
  },
};

/** Perfil somente leitura: sem botões de escrita. */
export const ReadOnly: Story = {
  args: { state: { ...idleState, canEdit: false } },
};

/** A falha ao marcar como concluída aparece acima da lista, em vermelho. */
export const UpdateFailed: Story = {
  args: {
    state: {
      ...idleState,
      updateError: 'Seu perfil é somente leitura e não permite alterar as tarefas.',
    },
  },
};

/** Caso limite: título enorme sem espaço e mais tarefas do que cabem numa página. */
export const LongTitleAndTruncated: Story = {
  args: {
    data: {
      tasks: [
        task({ id: 9, title: 'Tarefa'.repeat(30), description: 'Linha 1\nLinha 2\nLinha 3' }),
        ...tasks,
      ],
      total: 250,
      progress: { percentage: 25, done: 1, total: 4 },
      filter: { search: '', status: '' },
    },
    state: { ...idleState, isTruncated: true },
  },
};
