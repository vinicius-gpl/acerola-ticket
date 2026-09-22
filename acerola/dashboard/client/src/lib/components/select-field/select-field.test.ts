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

  /* O teste acima usa uma opção cujo valor e rótulo são iguais ("Ana"), então ele passaria
     mesmo se o campo mostrasse o valor cru. Este aqui separa os dois de propósito. */
  // feliz
  it('mostra o rótulo, não o valor guardado, antes de a lista ser aberta', () => {
    render(SelectField, {
      props: {
        data: {
          value: 'network',
          options: [
            { value: 'network', label: 'Internet / Rede' },
            { value: 'printer', label: 'Impressora' },
          ],
        },
        ui: { ariaLabel: 'Tipo de problema' },
        actions: { onChange: vi.fn() },
      },
    });

    const trigger = screen.getByRole('combobox', { name: 'Tipo de problema' });
    expect(trigger).toHaveTextContent('Internet / Rede');
    expect(trigger).not.toHaveTextContent('network');
  });

  // triste
  it('mostra o placeholder quando nada foi escolhido', () => {
    render(SelectField, {
      props: {
        data: { value: '', options: [{ value: 'network', label: 'Internet / Rede' }] },
        ui: { ariaLabel: 'Tipo de problema', placeholder: 'Selecione' },
        actions: { onChange: vi.fn() },
      },
    });

    expect(screen.getByRole('combobox', { name: 'Tipo de problema' })).toHaveTextContent(
      'Selecione',
    );
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
