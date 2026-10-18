import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import Harness from './acerola-search-popover-content-harness.test.svelte';

afterEach(() => vi.restoreAllMocks());

// feliz: abrir a lista não pede teclado, mas tocar na pesquisa continua permitindo digitar.
it('focuses the popup instead of the search field on mobile', async () => {
  const original = window.matchMedia;
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    ...original.call(window, query),
    matches: query === '(max-width: 639px)',
  }));
  render(Harness);
  await userEvent.click(screen.getByRole('button', { name: 'Escolher opção' }));
  const search = await screen.findByLabelText('Buscar opções');
  const popup = search.closest('[data-slot="popover-content"]');
  await waitFor(() => expect(popup).toHaveFocus());
  expect(search).not.toHaveFocus();
  await fireEvent.focus(search);
  await fireEvent.input(search, { target: { value: 'recepção' } });
  expect(search).toHaveValue('recepção');
});

// triste: o wrapper não deve cancelar decisões explícitas de foco de quem chama.
it('preserves the caller autofocus handler', async () => {
  const onOpenAutoFocus = vi.fn((event: Event) => event.preventDefault());
  render(Harness, { onOpenAutoFocus });
  await userEvent.click(screen.getByRole('button', { name: 'Escolher opção' }));
  await waitFor(() => expect(onOpenAutoFocus).toHaveBeenCalled());
  expect(screen.getByLabelText('Buscar opções')).not.toHaveFocus();
});
