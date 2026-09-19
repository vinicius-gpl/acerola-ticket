import { type Meta, type StoryObj } from '@storybook/react';

import { AppErrorBoundary } from './app-error-boundary.component';

/** Nasce quebrado de propósito, só para a boundary ter o que capturar. */
function Bomb(): never {
  throw new Error('Simulated failure for the story: the app shell does not really throw here.');
}

const meta = {
  title: 'Composers/AppErrorBoundary',
  component: AppErrorBoundary,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AppErrorBoundary>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: <div className="text-ink-700 p-8 text-sm">Conteúdo normal, sem erro nenhum.</div>,
  },
};

/**
 * A tela não fica em branco nem preta quando o render quebra — aparece o motivo e um
 * caminho para recarregar. É o pior caso possível sem esta boundary.
 */
export const CaughtError: Story = {
  args: {
    children: <Bomb />,
  },
};
