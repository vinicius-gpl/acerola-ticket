import { type Meta, type StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import ErrorState from './error-state.svelte';

const meta = {
  title: 'Primitives/ErrorState',
  component: ErrorState,
} satisfies Meta<typeof ErrorState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: {
      message: 'Não consegui falar com o servidor. Confira se ele está rodando e tente de novo.',
    },
  },
};

/** Com o botão: só quando tentar de novo pode resolver. */
export const WithRetry: Story = {
  args: {
    data: { title: 'A lista não carregou', message: 'O banco está ocupado com outra gravação.' },
    actions: { onRetry: fn() },
  },
};

export const Retrying: Story = {
  args: {
    data: { title: 'A lista não carregou', message: 'O banco está ocupado com outra gravação.' },
    state: { isRetrying: true },
    actions: { onRetry: fn() },
  },
};

/** Dentro de formulário ou modal: uma linha, sem título. */
export const Inline: Story = {
  args: {
    data: { message: 'Seu perfil é somente leitura e não permite alterar as tarefas.' },
    ui: { variant: 'inline' },
  },
};

/** Caso limite: mensagem técnica longa, sem espaço, não pode estourar a caixa. */
export const LongUnbrokenMessage: Story = {
  args: {
    data: { message: `Falha ao listar tarefas: ${'SQLITE_IOERR_SHORT_READ'.repeat(6)}` },
  },
  render: (args) => (
    <div className="w-72">
      <ErrorState {...args} />
    </div>
  ),
};
