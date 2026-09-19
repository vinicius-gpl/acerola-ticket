import { type Meta, type StoryObj } from '@storybook/react';
import { Plus, Trash2 } from 'lucide-react';
import { fn } from 'storybook/test';

import { ActionButton } from './action-button.component';

const meta = {
  title: 'Primitives/ActionButton',
  component: ActionButton,
  args: { actions: { onClick: fn() } },
} satisfies Meta<typeof ActionButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { data: { label: 'Nova tarefa' }, ui: { icon: Plus } },
};

export const AllVariants: Story = {
  args: { data: { label: 'Salvar' } },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <ActionButton data={{ label: 'Primário' }} ui={{ variant: 'primary' }} />
      <ActionButton data={{ label: 'Secundário' }} ui={{ variant: 'secondary' }} />
      <ActionButton data={{ label: 'Discreto' }} ui={{ variant: 'ghost' }} />
      <ActionButton data={{ label: 'Excluir' }} ui={{ variant: 'danger', icon: Trash2 }} />
    </div>
  ),
};

export const Small: Story = {
  args: { data: { label: 'Editar' }, ui: { size: 'sm', variant: 'secondary' } },
};

/** Só ícone: o rótulo vira `aria-label` — o leitor de tela continua sabendo o que é. */
export const IconOnly: Story = {
  args: {
    data: { label: 'Excluir tarefa' },
    ui: { icon: Trash2, isIconOnly: true, variant: 'ghost' },
  },
};

/** Carregando: trava e gira. Dois cliques seriam duas requisições. */
export const Loading: Story = {
  args: {
    data: { label: 'Excluir', loadingLabel: 'Excluindo…' },
    ui: { variant: 'danger', icon: Trash2 },
    state: { isLoading: true },
  },
};

export const Disabled: Story = {
  args: { data: { label: 'Nova tarefa' }, ui: { icon: Plus }, state: { isDisabled: true } },
};

/** Caso limite: rótulo longo numa coluna estreita. */
export const LongLabelInNarrowColumn: Story = {
  args: { data: { label: 'Exportar todas as tarefas concluídas do mês' } },
  render: (args) => (
    <div className="border-ink-300 w-48 border border-dashed p-2">
      <ActionButton {...args} />
    </div>
  ),
};
