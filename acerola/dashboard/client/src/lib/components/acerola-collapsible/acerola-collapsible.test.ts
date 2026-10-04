import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import Harness from './acerola-collapsible-harness.test.svelte';

const data = { title: 'Filtros avançados' };

describe('AcerolaCollapsible', () => {
  // feliz
  it('starts closed, with the title always visible', () => {
    render(Harness, { props: { data } });

    expect(screen.getByRole('button', { name: 'Filtros avançados' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('opens on click and tells the screen', async () => {
    const onOpenChange = vi.fn();
    render(Harness, { props: { data, actions: { onOpenChange } } });

    await fireEvent.click(screen.getByRole('button', { name: 'Filtros avançados' }));

    expect(screen.getByRole('button', { name: 'Filtros avançados' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('is born open when the screen asks for it', () => {
    render(Harness, { props: { data, state: { isOpen: true } } });

    expect(screen.getByRole('button', { name: 'Filtros avançados' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByTestId('conteudo')).toBeInTheDocument();
  });

  // triste
  it('does not open when disabled', async () => {
    const onOpenChange = vi.fn();
    render(Harness, { props: { data, state: { isDisabled: true }, actions: { onOpenChange } } });

    await fireEvent.click(screen.getByRole('button', { name: 'Filtros avançados' }));

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Filtros avançados' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
