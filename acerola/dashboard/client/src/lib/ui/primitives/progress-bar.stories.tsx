import { type Meta, type StoryObj } from '@storybook/react';

import { ProgressBar } from './progress-bar.component';

const meta = {
  title: 'Primitives/ProgressBar',
  component: ProgressBar,
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProgressBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { data: { percentage: 62, done: 8, total: 13 }, ui: { itemLabel: 'tarefas' } },
};

export const WithCount: Story = {
  args: { data: { percentage: 62, done: 8, total: 13 }, ui: { showCount: true } },
};

/** Cada faixa tem um tom, e é por ele que a lista é lida de relance. */
export const AllTones: Story = {
  args: { data: { percentage: 100, done: 13, total: 13 } },
  render: () => (
    <div className="space-y-3">
      <ProgressBar data={{ percentage: 100, done: 13, total: 13 }} />
      <ProgressBar data={{ percentage: 78, done: 10, total: 13 }} />
      <ProgressBar data={{ percentage: 46, done: 6, total: 13 }} />
      <ProgressBar data={{ percentage: 15, done: 2, total: 13 }} />
    </div>
  ),
};

/** Nada a cumprir NÃO é 0%: uma barra vermelha zerada acusaria atraso onde não há. */
export const NothingToDo: Story = {
  args: { data: { percentage: 0, done: 0, total: 0 }, ui: { emptyLabel: 'Sem tarefas' } },
};

/** Caso limite: um item só, e ele pendente. */
export const SingleItemPending: Story = {
  args: { data: { percentage: 0, done: 0, total: 1 }, ui: { showCount: true } },
};
