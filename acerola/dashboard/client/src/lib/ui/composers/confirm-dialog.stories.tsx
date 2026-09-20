import { type Meta, type StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { ConfirmDialog } from './confirm-dialog.component';

const meta = {
  title: 'Composers/ConfirmDialog',
  component: ConfirmDialog,
  args: {
    data: {
      title: 'Excluir esta tarefa?',
      description: '"Ligar para o cliente" será excluída. Não dá para desfazer.',
      confirmLabel: 'Excluir tarefa',
      confirmingLabel: 'Excluindo…',
    },
    state: { isOpen: true },
    actions: { onConfirm: fn(), onCancel: fn() },
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Confirming: Story = {
  args: { state: { isOpen: true, isConfirming: true } },
};

/** A recusa aparece dentro do modal, e ele continua aberto. */
export const WithError: Story = {
  args: { state: { isOpen: true, error: 'Excluir tarefas é uma ação de administrador.' } },
};

/** Ação que não é destrutiva: botão primário. */
export const PrimaryTone: Story = {
  args: {
    data: {
      title: 'Enviar para aprovação?',
      description: 'A tarefa sai da sua lista e vai para quem aprova.',
      confirmLabel: 'Enviar',
    },
    ui: { tone: 'primary' },
  },
};

/** Caso limite: título do registro enorme dentro da descrição. */
export const LongDescription: Story = {
  args: {
    data: {
      title: 'Excluir esta tarefa?',
      description: `"${'Tarefa com um título muito comprido '.repeat(6)}" será excluída. Não dá para desfazer.`,
      confirmLabel: 'Excluir tarefa',
    },
  },
};
