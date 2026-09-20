import { type Meta, type StoryObj } from '@storybook/react';

import { DonutChart } from './donut-chart.component';

const slices = [
  { label: 'Em andamento', value: 10 },
  { label: 'Concluído', value: 9 },
  { label: 'Aguardando pagamento', value: 6 },
  { label: 'Em vigor (vencimento)', value: 4 },
  { label: 'Sem obrigatoriedade', value: 2 },
  { label: 'Não iniciado', value: 1 },
];

const meta = {
  title: 'Primitives/DonutChart',
  component: DonutChart,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="h-72 w-full max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DonutChart>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { data: { slices, seriesLabel: 'Status' } },
};

/** Só duas fatias: o total no meio do anel precisa continuar legível. */
export const FewSlices: Story = {
  args: {
    data: {
      slices: [
        { label: 'Ativas', value: 7 },
        { label: 'Inativas', value: 1 },
      ],
      seriesLabel: 'Clientes',
    },
  },
};

export const Loading: Story = {
  args: { data: { slices, seriesLabel: 'Status' }, state: { isLoading: true } },
};

export const Empty: Story = {
  args: { data: { slices: [], seriesLabel: 'Status' } },
};

export const CustomEmptyLabel: Story = {
  args: {
    data: { slices: [], seriesLabel: 'Cidade' },
    ui: { emptyLabel: 'Nenhum cliente neste filtro' },
  },
};
