import { type Meta, type StoryObj } from '@storybook/react';

import { StatusBadge, type StatusBadgeTone } from './status-badge.component';

const meta = {
  title: 'Primitives/StatusBadge',
  component: StatusBadge,
} satisfies Meta<typeof StatusBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { data: { label: 'Em andamento' }, ui: { tone: 'info' } },
};

const TONES: { tone: StatusBadgeTone; label: string }[] = [
  { tone: 'neutral', label: 'A fazer' },
  { tone: 'info', label: 'Em andamento' },
  { tone: 'success', label: 'Concluída' },
  { tone: 'warning', label: 'Aguardando' },
  { tone: 'danger', label: 'Atrasada' },
  { tone: 'brand', label: 'Destaque' },
];

/** Todos os tons, para conferir a paleta de uma vez. */
export const AllTones: Story = {
  args: { data: { label: 'A fazer' } },
  render: () => (
    <div className="flex max-w-xl flex-wrap gap-2">
      {TONES.map(({ tone, label }) => (
        <StatusBadge key={tone} data={{ label }} ui={{ tone }} />
      ))}
    </div>
  ),
};

export const Small: Story = {
  args: { data: { label: 'Concluída' }, ui: { tone: 'success', size: 'sm' } },
};

/** Situação vazia não vira selo cinza: faria parecer que alguém respondeu algo. */
export const NotFilled: Story = {
  args: { data: { label: null } },
};

/** Caso limite: rótulo longo dentro de uma coluna estreita. */
export const LongLabelInNarrowColumn: Story = {
  args: { data: { label: 'Aguardando retorno do cliente' }, ui: { tone: 'warning' } },
  render: (args) => (
    <div className="border-ink-300 w-40 border border-dashed p-2">
      <StatusBadge {...args} />
    </div>
  ),
};
