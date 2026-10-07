import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { useTableViewModel } from '$lib/hooks/use-table-view/use-table-view.svelte';

import TableViewToggle from './acerola-table-view-toggle.svelte';

const STORAGE_KEY = 'acerola-table-view';

const tableButton = () => screen.getByRole('button', { name: 'Ver em tabela' });
const cardsButton = () => screen.getByRole('button', { name: 'Ver em cards' });

/* A preferência mora num `$state` de escopo de módulo, compartilhado entre os testes: cada um
   começa com ela de volta no padrão (tabela) e sem nada salvo. */
beforeEach(() => {
  const tableView = useTableViewModel();
  if (tableView.forceCards) tableView.actions.onToggle();
  window.localStorage.clear();
});

describe('AcerolaTableViewToggle', () => {
  // feliz
  it('shows both formats and marks the table as the one in use by default', () => {
    render(TableViewToggle);

    expect(screen.getByRole('group', { name: 'Formato da lista' })).toBeInTheDocument();
    expect(tableButton()).toHaveAttribute('aria-pressed', 'true');
    expect(cardsButton()).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches to cards and back, moving the mark and saving the choice', async () => {
    render(TableViewToggle);

    await userEvent.click(cardsButton());
    expect(cardsButton()).toHaveAttribute('aria-pressed', 'true');
    expect(tableButton()).toHaveAttribute('aria-pressed', 'false');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('cards');

    await userEvent.click(tableButton());
    expect(tableButton()).toHaveAttribute('aria-pressed', 'true');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('auto');
  });

  it('is born on cards when that is already the preference', () => {
    useTableViewModel().actions.onToggle();
    render(TableViewToggle);

    expect(cardsButton()).toHaveAttribute('aria-pressed', 'true');
    expect(tableButton()).toHaveAttribute('aria-pressed', 'false');
  });

  // triste
  /* Clicar no formato que JÁ está valendo não pode desligá-lo: são duas escolhas, não um
     liga/desliga. */
  it('keeps the format when the one already in use is clicked again', async () => {
    render(TableViewToggle);

    await userEvent.click(tableButton());
    await userEvent.click(tableButton());

    expect(tableButton()).toHaveAttribute('aria-pressed', 'true');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('survives repeated fast clicks on cards without getting stuck', async () => {
    render(TableViewToggle);

    await userEvent.click(cardsButton());
    await userEvent.click(cardsButton());
    await userEvent.click(cardsButton());

    expect(cardsButton()).toHaveAttribute('aria-pressed', 'true');
  });
});
