import { type Meta, type StoryObj } from '@storybook/react';
import { Building2, ClipboardList, ShieldCheck, Users } from 'lucide-react';

import StatCard, { StatCardGrid } from './stat-card.svelte';

const meta = {
  title: 'Primitives/StatCard',
  component: StatCard,
} satisfies Meta<typeof StatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { data: { label: 'Clientes', value: 560 } },
};

/** Um número que EXCLUI algo precisa dizer o que excluiu, ou dois painéis discordam. */
export const WithHint: Story = {
  args: {
    data: { label: 'Ativos', value: 641, hint: 'Exclui 1.067 arquivados' },
    ui: { tone: 'info' },
  },
};

export const AllTones: Story = {
  args: { data: { label: 'Total', value: 0 } },
  render: () => (
    <StatCardGrid>
      <StatCard data={{ label: 'Clientes', value: 560 }} ui={{ tone: 'brand' }} />
      <StatCard data={{ label: 'Concluídas', value: 145 }} ui={{ tone: 'success' }} />
      <StatCard data={{ label: 'Vencendo', value: 27 }} ui={{ tone: 'warning' }} />
      <StatCard data={{ label: 'Vencidos', value: 23 }} ui={{ tone: 'danger' }} />
      <StatCard data={{ label: 'Em andamento', value: 59 }} ui={{ tone: 'info' }} />
      <StatCard data={{ label: 'Não iniciado', value: 79 }} ui={{ tone: 'neutral' }} />
    </StatCardGrid>
  ),
};

/** Com ícone: o quadrado sólido substitui a barra — as duas juntas seriam redundantes. */
export const WithIcon: Story = {
  args: { data: { label: 'Clientes', value: 7 }, ui: { tone: 'brand', icon: Building2 } },
};

export const AllTonesWithIcon: Story = {
  args: { data: { label: 'Total', value: 0 } },
  render: () => (
    <StatCardGrid>
      <StatCard data={{ label: 'Clientes', value: 7 }} ui={{ tone: 'brand', icon: Building2 }} />
      <StatCard
        data={{ label: 'Total Geral', value: 25 }}
        ui={{ tone: 'neutral', icon: ClipboardList }}
      />
      <StatCard
        data={{ label: 'Ativos', value: 24, hint: 'Exclui 1 arquivado' }}
        ui={{ tone: 'info', icon: ShieldCheck }}
      />
      <StatCard data={{ label: 'Equipe', value: 4 }} ui={{ tone: 'neutral', icon: Users }} />
    </StatCardGrid>
  ),
};

export const Large: Story = {
  args: { data: { label: 'Total geral', value: 1708 }, ui: { tone: 'brand', size: 'lg' } },
};

export const Loading: Story = {
  args: { data: { label: 'Clientes', value: 0 }, state: { isLoading: true } },
};

/** Caso limite: zero é um número legítimo e não pode virar traço nem sumir. */
export const Zero: Story = {
  args: { data: { label: 'Inativas', value: 0 }, ui: { tone: 'neutral' } },
};

/** Caso limite: rótulo comprido não pode empurrar o número para fora do cartão. */
export const LongLabel: Story = {
  args: {
    data: {
      label: 'Tarefas sem prazo definido nem responsável',
      value: 1425,
      hint: 'Inclui vencidos antigos e sem prazo definido',
    },
    ui: { tone: 'danger', className: 'max-w-[220px]' },
  },
};
