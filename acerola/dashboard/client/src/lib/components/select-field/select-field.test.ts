import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import SelectField from './select-field.svelte';

const owners = [
  { value: '', label: 'Todos os responsáveis' },
  { value: 'Ana', label: 'Ana' },
  { value: 'Bia', label: 'Bia' },
];

describe('SelectField', () => {
  // feliz
  it('mostra o rótulo da opção selecionada', () => {
    render(SelectField, {
      props: {
        data: { value: 'Ana', options: owners },
        ui: { ariaLabel: 'Responsável' },
        actions: { onChange: vi.fn() },
      },
    });

    expect(screen.getByRole('combobox', { name: 'Responsável' })).toHaveTextContent('Ana');
  });

  /* `fireEvent`, não `userEvent`, para abrir e escolher: o jsdom não calcula layout de
     verdade, e o `userEvent` do bits-ui Select — que abre num portal, fora da árvore do
     componente — fica preso esperando um estado de "visível" que o jsdom nunca resolve.
     `fireEvent` dispara o evento direto, sem essa checagem de geometria.
     bits-ui SelectItemState usa `onpointerup` (não `onclick`) para selecionar — por isso
     usamos `fireEvent.pointerUp` no item, não `fireEvent.click`. */

  // feliz
  it('escolher uma opção chama onChange com o valor dela', async () => {
    const onChange = vi.fn();

    render(SelectField, {
      props: {
        data: { value: '', options: owners },
        ui: { ariaLabel: 'Responsável', placeholder: 'Todos os responsáveis' },
        actions: { onChange },
      },
    });

    const trigger = screen.getByRole('combobox', { name: 'Responsável' });
    await fireEvent.pointerDown(trigger);
    await fireEvent.click(trigger);
    const option = await screen.findByRole('option', { name: 'Ana' });
    await fireEvent.pointerUp(option);

    expect(onChange).toHaveBeenCalledWith('Ana');
  });

  // triste
  it('escolher a opção vazia devolve string vazia, não o sentinel interno', async () => {
    const onChange = vi.fn();

    render(SelectField, {
      props: {
        data: { value: 'Ana', options: owners },
        ui: { ariaLabel: 'Responsável' },
        actions: { onChange },
      },
    });

    const trigger = screen.getByRole('combobox', { name: 'Responsável' });
    await fireEvent.pointerDown(trigger);
    await fireEvent.click(trigger);
    const option = await screen.findByRole('option', { name: 'Todos os responsáveis' });
    await fireEvent.pointerUp(option);

    expect(onChange).toHaveBeenCalledWith('');
  });

  // triste
  it('desabilitado não abre o menu', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(SelectField, {
      props: {
        data: { value: '', options: owners },
        ui: { ariaLabel: 'Responsável' },
        state: { isDisabled: true },
        actions: { onChange },
      },
    });

    const trigger = screen.getByRole('combobox', { name: 'Responsável' });
    expect(trigger).toBeDisabled();

    await user.click(trigger);
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });
});
