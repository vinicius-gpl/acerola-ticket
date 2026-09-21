import { type Meta, type StoryObj } from '@storybook/react';

import SubmitButton from './submit-button.svelte';

const meta = {
  title: 'Primitives/SubmitButton',
  component: SubmitButton,
} satisfies Meta<typeof SubmitButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { data: { label: 'Entrar' } },
};

/** Enquanto envia, o rótulo muda e o botão trava — dois cliques seriam dois registros. */
export const Loading: Story = {
  args: { data: { label: 'Entrar', loadingLabel: 'Entrando…' }, state: { isLoading: true } },
};

export const Disabled: Story = {
  args: { data: { label: 'Entrar' }, state: { isDisabled: true } },
};

/** Caso limite: rótulo longo numa coluna estreita. */
export const LongLabelInNarrowColumn: Story = {
  args: { data: { label: 'Criar minha conta no sistema' } },
  render: (args) => (
    <div className="border-ink-300 w-48 border border-dashed p-2">
      <SubmitButton {...args} />
    </div>
  ),
};
