import { type Meta, type StoryObj } from '@storybook/react';
import { Plus, SearchX } from 'lucide-react';

import ActionButton from '$lib/components/action-button/action-button.svelte';
import EmptyState from './empty-state.svelte';

const meta = {
  title: 'Primitives/EmptyState',
  component: EmptyState,
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { data: { title: 'Nenhuma tarefa ainda' } },
};

/** Com o próximo passo e a ação. É o formato preferido. */
export const WithAction: Story = {
  args: {
    data: {
      title: 'Nenhuma tarefa ainda',
      description: 'Cadastre a primeira para começar a acompanhar o trabalho.',
    },
    children: <ActionButton data={{ label: 'Nova tarefa' }} ui={{ icon: Plus }} />,
  },
};

/** O filtro escondeu tudo: a saída é limpar o filtro, não cadastrar. */
export const FilteredOut: Story = {
  args: {
    data: {
      title: 'Nenhuma tarefa encontrada',
      description: 'Nada combina com a busca. Tente outro termo ou limpe os filtros.',
    },
    ui: { icon: SearchX },
    children: <ActionButton data={{ label: 'Limpar filtros' }} ui={{ variant: 'secondary' }} />,
  },
};

/** Caso limite: descrição longa numa coluna estreita. */
export const LongDescriptionInNarrowColumn: Story = {
  args: {
    data: {
      title: 'Nenhum registro',
      description:
        'Quando alguém cadastrar o primeiro registro, ele aparece aqui com a situação, o responsável e a data em que foi criado.',
    },
  },
  render: (args) => (
    <div className="w-64">
      <EmptyState {...args} />
    </div>
  ),
};
