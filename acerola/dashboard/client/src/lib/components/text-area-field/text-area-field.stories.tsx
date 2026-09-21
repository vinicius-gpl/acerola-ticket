import { type Meta, type StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import TextAreaField from './text-area-field.svelte';

const meta = {
  title: 'Primitives/TextAreaField',
  component: TextAreaField,
  args: { actions: { onChange: fn(), onBlur: fn() } },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TextAreaField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: {
      label: 'Descrição',
      name: 'description',
      value: '',
      placeholder: 'Detalhes, se houver',
    },
  },
};

export const Filled: Story = {
  args: {
    data: { label: 'Descrição', name: 'description', value: 'Confirmar o horário da visita.' },
  },
};

/** Perto do limite, o contador aparece. */
export const NearLimit: Story = {
  args: {
    data: { label: 'Descrição', name: 'description', value: 'a'.repeat(90), maxLength: 100 },
  },
};

export const WithError: Story = {
  args: {
    data: { label: 'Descrição', name: 'description', value: 'a'.repeat(120), maxLength: 100 },
    state: { error: 'A descrição pode ter até 100 caracteres' },
  },
};

export const Disabled: Story = {
  args: {
    data: { label: 'Descrição', name: 'description', value: 'Não editável agora' },
    state: { isDisabled: true },
  },
};

/** Caso limite: erro longo numa coluna estreita. */
export const LongErrorInNarrowColumn: Story = {
  args: {
    data: { label: 'Descrição', name: 'description', value: '' },
    state: { error: 'Explique o que precisa ser feito para que outra pessoa consiga continuar' },
  },
  render: (args) => (
    <div className="border-ink-300 w-56 border border-dashed p-2">
      <TextAreaField {...args} />
    </div>
  ),
};
