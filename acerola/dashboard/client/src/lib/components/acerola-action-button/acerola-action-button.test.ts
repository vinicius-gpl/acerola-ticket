import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Trash2 from '@lucide/svelte/icons/trash-2';
import { describe, expect, it, vi } from 'vitest';

import ActionButton from './acerola-action-button.svelte';

describe('AcerolaActionButton', () => {
  // feliz
  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(ActionButton, { props: { data: { label: 'Salvar' }, actions: { onClick } } });

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('keeps the name for screen readers when only the icon shows', () => {
    render(ActionButton, {
      props: { data: { label: 'Excluir tarefa' }, ui: { icon: Trash2, isIconOnly: true } },
    });

    expect(screen.getByRole('button', { name: 'Excluir tarefa' })).toBeInTheDocument();
    expect(screen.queryByText('Excluir tarefa')).not.toBeInTheDocument();
  });

  // triste
  /* Dois cliques em "Excluir" seriam duas requisições. */
  it('locks while loading and shows the loading label', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(ActionButton, {
      props: {
        data: { label: 'Excluir', loadingLabel: 'Excluindo…' },
        state: { isLoading: true },
        actions: { onClick },
      },
    });

    const button = screen.getByRole('button', { name: 'Excluindo…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(ActionButton, {
      props: {
        data: { label: 'Salvar' },
        state: { isDisabled: true },
        actions: { onClick },
      },
    });

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onClick).not.toHaveBeenCalled();
  });

  /* A RÉGUA DE MEDIDAS: o degrau escolhido tem que chegar na marcação, senão a altura volta
     a ser a do componente baixado — e o botão desalinha do campo ao lado. */
  it('wears the height step it was given', () => {
    render(ActionButton, { props: { data: { label: 'Salvar' }, ui: { size: 'lg' } } });

    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveClass('control-lg');
  });

  it('wears the square step when only the icon shows', () => {
    render(ActionButton, {
      props: { data: { label: 'Excluir' }, ui: { size: 'sm', icon: Trash2, isIconOnly: true } },
    });

    expect(screen.getByRole('button', { name: 'Excluir' })).toHaveClass('control-icon-sm');
  });

  /* `type="button"` impede que um botão dentro de formulário o envie sem querer. */
  it('announces whether it is pressed when it is part of a choice', () => {
    render(ActionButton, { props: { data: { label: 'Ver em cards' }, state: { isPressed: true } } });

    expect(screen.getByRole('button', { name: 'Ver em cards' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('says nothing about being pressed when it is a plain action', () => {
    render(ActionButton, { props: { data: { label: 'Salvar' } } });

    expect(screen.getByRole('button', { name: 'Salvar' })).not.toHaveAttribute('aria-pressed');
  });

  it('never submits a form by accident', () => {
    render(ActionButton, { props: { data: { label: 'Cancelar' } } });

    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveAttribute('type', 'button');
  });
});
