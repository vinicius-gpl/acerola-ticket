import { type Meta, type StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { ColumnChart } from './column-chart.component';

const slices = [
  { label: 'Ana', value: 12 },
  { label: 'Bia', value: 9 },
  { label: 'Caio', value: 6 },
  { label: 'Duda', value: 3 },
];

const meta = {
  title: 'Primitives/ColumnChart',
  component: ColumnChart,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="h-72 w-full max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ColumnChart>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { data: { slices, seriesLabel: 'Tarefas' } },
};

/** Com clique: a coluna vira o caminho para a lista filtrada. */
export const Clickable: Story = {
  args: { data: { slices, seriesLabel: 'Tarefas' }, actions: { onSelect: fn() } },
};

export const Loading: Story = {
  args: { data: { slices, seriesLabel: 'Tarefas' }, state: { isLoading: true } },
};

export const Empty: Story = {
  args: {
    data: { slices: [], seriesLabel: 'Tarefas' },
    ui: { emptyLabel: 'Nenhuma tarefa ainda' },
  },
};

/** Caso limite: rótulos longos no eixo são cortados; o nome inteiro fica no tooltip. */
export const LongLabels: Story = {
  args: {
    data: {
      slices: [
        { label: 'Responsável com nome muito comprido', value: 8 },
        { label: 'Outro nome igualmente comprido', value: 5 },
        { label: 'Curto', value: 2 },
      ],
      seriesLabel: 'Tarefas',
    },
  },
};

/** Caso limite: uma coluna só. */
export const SingleColumn: Story = {
  args: { data: { slices: [{ label: 'Ana', value: 1 }], seriesLabel: 'Tarefas' } },
};
