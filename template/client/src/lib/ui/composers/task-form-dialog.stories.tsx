import { type Meta, type StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { TaskFormDialog } from './task-form-dialog.component';

const emptyFields = {
  title: { value: '', error: null },
  description: { value: '', error: null },
  status: { value: 'todo', error: null },
};

const meta = {
  title: 'Composers/TaskFormDialog',
  component: TaskFormDialog,
  args: {
    data: { mode: 'create', fields: emptyFields },
    state: { isOpen: true },
    actions: { onChange: fn(), onBlur: fn(), onSubmit: fn(), onClose: fn() },
  },
} satisfies Meta<typeof TaskFormDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Create: Story = {};

export const Edit: Story = {
  args: {
    data: {
      mode: 'edit',
      fields: {
        title: { value: 'Ligar para o cliente', error: null },
        description: { value: 'Confirmar o horário da visita.', error: null },
        status: { value: 'doing', error: null },
      },
    },
  },
};

/** O erro de campo aparece colado nele, com o texto do schema compartilhado. */
export const WithFieldError: Story = {
  args: {
    data: {
      mode: 'create',
      fields: { ...emptyFields, title: { value: '', error: 'Informe o título' } },
    },
  },
};

export const Submitting: Story = {
  args: {
    data: {
      mode: 'edit',
      fields: { ...emptyFields, title: { value: 'Revisar contrato', error: null } },
    },
    state: { isOpen: true, isSubmitting: true },
  },
};

/** A recusa do servidor aparece dentro do modal, que continua aberto com o que foi digitado. */
export const WithServerError: Story = {
  args: {
    data: {
      mode: 'create',
      fields: { ...emptyFields, title: { value: 'Nova tarefa', error: null } },
    },
    state: {
      isOpen: true,
      error: 'Seu perfil é somente leitura e não permite alterar as tarefas.',
    },
  },
};

/** Caso limite: título no limite e descrição perto do máximo (o contador aparece). */
export const LongContent: Story = {
  args: {
    data: {
      mode: 'edit',
      fields: {
        title: { value: 'T'.repeat(120), error: null },
        description: { value: 'Descrição longa. '.repeat(100), error: null },
        status: { value: 'todo', error: null },
      },
    },
  },
};
