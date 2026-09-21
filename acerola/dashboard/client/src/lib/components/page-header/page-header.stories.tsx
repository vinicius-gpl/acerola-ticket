import { type Meta, type StoryObj } from '@storybook/react';
import { Download, Plus } from 'lucide-react';

import ActionButton from '$lib/components/action-button/action-button.svelte';
import PageHeader from './page-header.svelte';

const meta = {
  title: 'Primitives/PageHeader',
  component: PageHeader,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof PageHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: { title: 'Tarefas', description: 'O que a equipe precisa fazer, e em que pé está.' },
  },
};

export const WithActions: Story = {
  args: {
    data: { title: 'Tarefas', description: 'O que a equipe precisa fazer, e em que pé está.' },
    children: (
      <>
        <ActionButton data={{ label: 'Exportar' }} ui={{ variant: 'secondary', icon: Download }} />
        <ActionButton data={{ label: 'Nova tarefa' }} ui={{ icon: Plus }} />
      </>
    ),
  },
};

export const TitleOnly: Story = {
  args: { data: { title: 'Configurações' } },
};

/** Caso limite: título e descrição longos numa tela estreita — as ações descem. */
export const LongTextOnNarrowScreen: Story = {
  args: {
    data: {
      title: 'Acompanhamento de tarefas da equipe comercial',
      description: 'Tudo o que foi combinado com clientes nas últimas reuniões, por responsável.',
    },
    children: <ActionButton data={{ label: 'Nova tarefa' }} ui={{ icon: Plus }} />,
  },
  render: (args) => (
    <div className="w-80">
      <PageHeader {...args} />
    </div>
  ),
};
