import {
  type Maintenance,
  type PreventiveDue,
} from '@template/shared/schemas/maintenance.schema';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import MaintenanceListView, {
  machineLabelOf,
  type MaintenanceListFilter,
} from './maintenance-list-view.svelte';

function maintenance(over: Partial<Maintenance> = {}): Maintenance {
  return {
    id: 1,
    computerId: 3,
    computerName: 'CONTABIL-03',
    computerDisplayName: 'Contábil — mesa do fechamento',
    computerDepartment: 'contabil',
    otherMachine: null,
    type: 'corrective',
    description: 'Cooler do processador substituído.',
    performedBy: 'Suporte TI',
    performedAt: '2026-09-20T12:00:00.000Z',
    createdAt: '2026-09-20T13:00:00.000Z',
    createdBy: 'suporte@azuos.local',
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

const preventive: PreventiveDue[] = [
  {
    computerId: 2,
    computerName: 'FINANCEIRO-02',
    computerDisplayName: 'Financeiro — mesa 2',
    computerDepartment: 'financeiro',
    lastDoneAt: '2026-04-20T12:00:00.000Z',
    status: 'due',
    maintenanceCount: 3,
  },
];

const emptyFilter: MaintenanceListFilter = { search: '', type: '', computerId: null };

const actions = {
  onSearchChange: vi.fn(),
  onTypeChange: vi.fn(),
  onClearFilters: vi.fn(),
  onRetry: vi.fn(),
  onRegister: vi.fn(),
  onEdit: vi.fn(),
  onAskRemove: vi.fn(),
  onCancelRemove: vi.fn(),
  onConfirmRemove: vi.fn(),
};

/* O tipo é escrito à mão: inferido de `null`, `error` viraria "só aceita nulo" e o teste do
   caminho triste não compilaria. */
const settled: {
  isLoading: boolean;
  isEmpty: boolean;
  isFilteredOut: boolean;
  isTruncated: boolean;
  error: string | null;
} = {
  isLoading: false,
  isEmpty: false,
  isFilteredOut: false,
  isTruncated: false,
  error: null,
};

function renderView(over: {
  maintenances?: Maintenance[];
  removing?: Maintenance | null;
  state?: Partial<typeof settled> & { actionError?: string | null; isRemoving?: boolean };
} = {}) {
  return render(MaintenanceListView, {
    props: {
      data: {
        maintenances: over.maintenances ?? [maintenance()],
        total: over.maintenances?.length ?? 1,
        preventive,
        filter: emptyFilter,
        removing: over.removing ?? null,
      },
      state: { ...settled, ...over.state },
      actions,
    },
  });
}

describe('machineLabelOf', () => {
  // feliz
  it('reads an inventoried machine by the nickname people use', () => {
    expect(machineLabelOf(maintenance())).toBe('Contábil — mesa do fechamento');
  });

  it('reads equipment outside the inventory by what was typed', () => {
    const record = maintenance({
      computerId: null,
      computerName: null,
      computerDisplayName: null,
      otherMachine: 'Impressora da recepção',
    });

    expect(machineLabelOf(record)).toBe('Impressora da recepção');
  });

  // triste
  it('falls back to the technical name when the machine has no nickname', () => {
    expect(machineLabelOf(maintenance({ computerDisplayName: null }))).toBe('CONTABIL-03');
  });
});

describe('MaintenanceListView', () => {
  // feliz
  it('lists what was done, on which machine and by whom', () => {
    renderView();

    expect(screen.getByText('Cooler do processador substituído.')).toBeInTheDocument();
    expect(screen.getByText('Contábil — mesa do fechamento')).toBeInTheDocument();
    expect(screen.getByText('Corretiva')).toBeInTheDocument();
  });

  /* O lembrete abre o formulário JÁ com a máquina: quem clica ali está olhando para ela. */
  it('opens the form pointing at the machine when the reminder asks for it', async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(actions.onRegister).toHaveBeenCalledWith(2);
  });

  it('asks before deleting, naming the record', async () => {
    const user = userEvent.setup();
    renderView({ removing: maintenance() });

    const dialog = screen.getByRole('dialog');

    expect(within(dialog).getByText(/Contábil — mesa do fechamento/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Excluir manutenção' }));

    expect(actions.onConfirmRemove).toHaveBeenCalled();
  });

  // triste
  it('shows the reason the history did not load', () => {
    renderView({ state: { error: 'Não consegui falar com o servidor.' } });

    expect(screen.getAllByRole('alert')[0]).toHaveTextContent(
      'Não consegui falar com o servidor.',
    );
  });

  /* Registro lançado correndo, sem descrição e sem responsável: a tela mostra traço, e não
     um buraco que faz a linha parecer quebrada. */
  it('shows a dash for what was left blank', () => {
    renderView({
      maintenances: [maintenance({ description: null, performedBy: null })],
    });

    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('separates an empty history from a filter that hid everything', () => {
    renderView({ maintenances: [], state: { isEmpty: true } });

    expect(screen.getByText('Nenhuma manutenção registrada')).toBeInTheDocument();
  });

  it('offers to clear the filters when they hid everything', () => {
    renderView({ maintenances: [], state: { isFilteredOut: true } });

    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument();
  });

  /* Falha de exclusão fica na tela, com o motivo (CONTRIBUTING §15). */
  it('keeps the failure of a delete on screen', () => {
    renderView({ state: { actionError: 'Este registro é de outra pessoa.' } });

    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('Este registro é de outra pessoa.');
  });
});
