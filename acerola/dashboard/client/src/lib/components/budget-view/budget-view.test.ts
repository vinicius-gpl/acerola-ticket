import { type Budget, type BudgetMachine, type BudgetNeed } from '@template/shared/schemas/budget.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import BudgetView, {
  estimateTextOf,
  machineLabelOf,
  machineValueOf,
  needSummaryOf,
} from './budget-view.svelte';

const machine: BudgetMachine = {
  computerId: 2,
  computerName: 'FINANCEIRO-02',
  computerDisplayName: 'Financeiro — mesa 2',
  department: 'financeiro',
  value: 4,
};

function need(over: Partial<BudgetNeed> = {}): BudgetNeed {
  return { key: 'memory', needed: 0, inStock: 0, toBuy: 0, machines: [], ...over };
}

function budget(first: Partial<BudgetNeed> = {}): Budget {
  return {
    needs: [
      need({ needed: 12, inStock: 4, toBuy: 8, machines: [machine], ...first }),
      need({ key: 'disk' }),
      need({ key: 'computer' }),
    ],
  };
}

const actions = {
  onRetry: vi.fn(),
  onOpenMachine: vi.fn(),
  onOpenComputers: vi.fn(),
  onOpenParts: vi.fn(),
};

const settled = { isLoading: false, isEmpty: false, isCovered: false, error: null };

function renderView(props: Partial<Parameters<typeof BudgetView>[1]> = {}) {
  return render(BudgetView, {
    props: { data: { budget: budget() }, state: settled, actions, ...props } as never,
  });
}

describe('needSummaryOf', () => {
  // feliz
  it('reads the whole subtraction in one sentence', () => {
    expect(needSummaryOf(need({ needed: 12, inStock: 4, toBuy: 8 }))).toBe(
      '12 precisam, o depósito tem 4 — faltam 8.',
    );
  });

  it('says the storeroom covers it', () => {
    expect(needSummaryOf(need({ needed: 3, inStock: 5 }))).toContain('não precisa comprar');
  });

  // triste
  it('says nobody needs it', () => {
    expect(needSummaryOf(need())).toBe('Nenhuma máquina precisa disso agora.');
  });
});

describe('estimateTextOf', () => {
  // feliz
  it('turns the quantity into a price range', () => {
    expect(estimateTextOf('memory', 2)).toMatch(/R\$.*a.*R\$/);
  });

  // triste
  /* Sem compra não há estimativa: "R$ 0 a R$ 0" só ocuparia a linha. */
  it('estimates nothing when there is nothing to buy', () => {
    expect(estimateTextOf('memory', 0)).toBeNull();
  });
});

describe('machineLabelOf', () => {
  // feliz
  it('prefers the nickname people recognise', () => {
    expect(machineLabelOf(machine)).toBe('Financeiro — mesa 2');
  });

  // triste
  it('falls back to the technical name', () => {
    expect(machineLabelOf({ ...machine, computerDisplayName: '   ' })).toBe('FINANCEIRO-02');
  });
});

describe('machineValueOf', () => {
  // feliz
  it('puts the unit next to the number that put the machine on the list', () => {
    expect(machineValueOf(need(), machine)).toBe('4 GB de memória');
    expect(machineValueOf(need({ key: 'disk' }), { ...machine, value: 7 })).toBe(
      '7% livre no disco',
    );
  });
});

describe('BudgetView', () => {
  // feliz
  it('shows the whole account, not only what to buy', () => {
    renderView();

    expect(screen.getByText('12 precisam, o depósito tem 4 — faltam 8.')).toBeInTheDocument();
    expect(screen.getByText('Comprar 8')).toBeInTheDocument();
  });

  /* A faixa vem sempre com a data: um preço sem data vira cotação na primeira reunião. */
  it('marks the price range as a dated reference', () => {
    renderView();

    expect(screen.getAllByText(/não é cotação/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/faixa de referência de/).length).toBeGreaterThan(0);
  });

  it('shows where to look, with a link per store', () => {
    renderView();

    expect(screen.getAllByRole('link', { name: 'Kabum' }).length).toBeGreaterThan(0);
  });

  it('opens the record of a machine that needs the part', async () => {
    renderView();

    await userEvent.click(screen.getAllByRole('button', { name: 'Abrir ficha' })[0]!);

    expect(actions.onOpenMachine).toHaveBeenCalledWith(2);
  });

  it('opens the storeroom from the header', async () => {
    renderView();

    await userEvent.click(screen.getByRole('button', { name: 'Ver o depósito' }));

    expect(actions.onOpenParts).toHaveBeenCalled();
  });

  /* A lista corta em dez, e o número total continua inteiro: o resto vira um caminho para o
     Inventário, e não um número que some. */
  it('points to the inventory when more machines need it than the list shows', async () => {
    renderView({ data: { budget: budget({ needed: 34, toBuy: 30 }) } });

    expect(screen.getByText(/E mais 33 máquina\(s\) na mesma situação/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'ver no Inventário' }));

    expect(actions.onOpenComputers).toHaveBeenCalled();
  });

  it('celebrates when the storeroom covers everything', () => {
    renderView({
      data: { budget: budget({ needed: 3, inStock: 9, toBuy: 0 }) },
      state: { ...settled, isCovered: true },
    });

    expect(screen.getByText(/Não precisa comprar nada/)).toBeInTheDocument();
  });

  // triste
  it('shows the reason the data did not load', () => {
    renderView({ data: { budget: null }, state: { ...settled, error: 'O servidor tropeçou.' } });

    expect(screen.getByText('O servidor tropeçou.')).toBeInTheDocument();
  });

  it('says it is still crossing the data', () => {
    renderView({ data: { budget: null }, state: { ...settled, isLoading: true } });

    expect(screen.getByText('Cruzando o parque com o depósito…')).toBeInTheDocument();
  });

  /* Parque vazio não é "nada a comprar": é não ter o que medir ainda, e o texto manda
     cadastrar as máquinas. */
  it('tells an empty park where to start', () => {
    renderView({ state: { ...settled, isEmpty: true } });

    expect(screen.getByText('Nada a orçar ainda')).toBeInTheDocument();
    /* Nenhuma necessidade aparece junto do vazio: seriam dois recados contraditórios. */
    expect(screen.queryByText('Comprar 8')).toBeNull();
  });

  it('keeps a need with nothing to buy on screen', () => {
    renderView({ data: { budget: budget({ needed: 0, inStock: 0, toBuy: 0, machines: [] }) } });

    expect(screen.getAllByText('Nada a comprar').length).toBeGreaterThan(0);
  });
});
