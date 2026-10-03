import { beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'acerola-table-view';

/** O estado mora num `$state` de escopo de módulo — cada teste precisa de um módulo novo. */
async function freshTableView() {
  vi.resetModules();

  return import('./use-table-view.svelte');
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('useTableViewModel', () => {
  // feliz
  it('começa automático quando nada foi salvo ainda', async () => {
    const { useTableViewModel } = await freshTableView();

    expect(useTableViewModel().view).toBe('auto');
    expect(useTableViewModel().forceCards).toBe(false);
  });

  it('liga "sempre em cards" e guarda a escolha', async () => {
    const { useTableViewModel } = await freshTableView();
    const tableView = useTableViewModel();

    tableView.actions.onToggle();

    expect(tableView.view).toBe('cards');
    expect(tableView.forceCards).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('cards');
  });

  it('alternar de novo volta para automático', async () => {
    const { useTableViewModel } = await freshTableView();
    const tableView = useTableViewModel();

    tableView.actions.onToggle();
    tableView.actions.onToggle();

    expect(tableView.view).toBe('auto');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('auto');
  });

  it('a escolha é compartilhada entre quem chamar o hook — não é cópia por tela', async () => {
    const { useTableViewModel } = await freshTableView();

    useTableViewModel().actions.onToggle();

    expect(useTableViewModel().forceCards).toBe(true);
  });

  // triste
  it('ignora um valor salvo inválido e cai em automático', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'tabela-mesmo-sempre');
    const { useTableViewModel } = await freshTableView();

    expect(useTableViewModel().view).toBe('auto');
  });
});
