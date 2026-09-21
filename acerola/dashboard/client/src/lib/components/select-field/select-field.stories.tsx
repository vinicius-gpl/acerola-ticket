import { type Meta, type StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import SelectField from './select-field.svelte';

const meta = {
  title: 'Primitives/SelectField',
  component: SelectField,
  decorators: [
    (Story) => (
      <div className="w-56">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SelectField>;

export default meta;

type Story = StoryObj<typeof meta>;

const owners = [
  { value: '', label: 'Todos os responsáveis' },
  { value: 'Ana', label: 'Ana' },
  { value: 'Bia', label: 'Bia' },
];

export const Default: Story = {
  args: {
    data: { value: '', options: owners },
    ui: { ariaLabel: 'Responsável', placeholder: 'Todos os responsáveis' },
    actions: { onChange: fn() },
  },
};

export const WithValueSelected: Story = {
  args: { ...Default.args, data: { value: 'Ana', options: owners } },
};

export const Disabled: Story = {
  args: { ...Default.args, state: { isDisabled: true } },
};

/** Caso limite: lista de opções longa o bastante para rolar dentro do menu. */
export const ManyOptions: Story = {
  args: {
    ...Default.args,
    data: {
      value: '',
      options: [
        { value: '', label: 'Todos' },
        ...Array.from({ length: 20 }, (_, index) => ({
          value: `opcao-${index}`,
          label: `Opção ${index + 1}`,
        })),
      ],
    },
  },
};
