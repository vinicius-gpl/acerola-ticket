import { type Computer } from '@template/shared/schemas/computer.schema';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DisposalListView, {
  machineLabelOf,
  type DisposalFilter,
  type DisposalSummary,
} from './disposal-list-view.svelte';

const GB = 1024 ** 3;

function computer(over: Partial<Computer> = {}): Computer {
  return {
    id: 9,
    name: 'RECEPCAO-09',
    displayName: 'Recepção — micro antigo do balcão',
    responsibleName: 'Bia Costa',
    department: 'recepcao',
    hardware: {
      os: 'Microsoft Windows 10 Pro',
      platform: 'windows',
      platformVersion: null,
      kernelVersion: null,
      arch: 'amd64',
      cpuModel: 'Intel Core i3-3220',
      logicalCpus: 4,
      physicalCpus: 2,
      totalMemoryBytes: 4 * GB,
      macAddress: null,
      localIp: null,
      totalDiskBytes: 120 * GB,
      freeDiskBytes: 30 * GB,
      uptimeSeconds: null,
      bootTime: null,
    },
    healthScore: 88,
    healthStatus: 'attention',
    warnings: [],
    isOnline: false,
    lastSeenAt: '2026-03-01T12:00:00.000Z',
    agentVersion: '0.9.0',
    isArchived: false,
    isBlocked: false,
    blockReason: null,
    disposedAt: '2026-08-09T12:00:00.000Z',
    disposalType: 'defect',
    disposalReason: 'Fonte queimada duas vezes no mesmo semestre.',
    createdAt: '2026-05-01T12:00:00.000Z',
    createdBy: 'suporte@azuos.local',
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

const summary: DisposalSummary = { total: 2, defect: 1, scrap: 1 };

const emptyFilter: DisposalFilter = { search: '', type: '' };

const actions = {
  onSearchChange: vi.fn(),
  onTypeChange: vi.fn(),
  onClearFilters: vi.fn(),
  onRetry: vi.fn(),
  onOpenMachine: vi.fn(),
  onAskRestore: vi.fn(),
  onCancelRestore: vi.fn(),
  onConfirmRestore: vi.fn(),
};

const settled: {
  isLoading: boolean;
  isEmpty: boolean;
  isFilteredOut: boolean;
  error: string | null;
} = { isLoading: false, isEmpty: false, isFilteredOut: false, error: null };

function renderView(
  over: {
    computers?: Computer[];
    restoring?: Computer | null;
    state?: Partial<typeof settled> & { actionError?: string | null; isRestoring?: boolean };
  } = {},
) {
  return render(DisposalListView, {
    props: {
      data: {
        computers: over.computers ?? [computer()],
        total: over.computers?.length ?? 1,
        summary,
        filter: emptyFilter,
        restoring: over.restoring ?? null,
      },
      state: { ...settled, ...over.state },
      actions,
    },
  });
}

describe('machineLabelOf', () => {
  // feliz
  it('prefers the nickname the IT team gave', () => {
    expect(machineLabelOf(computer())).toBe('Recepção — micro antigo do balcão');
  });

  // triste
  it('falls back to the machine name when there is no nickname', () => {
    expect(machineLabelOf(computer({ displayName: null }))).toBe('RECEPCAO-09');
  });
});

describe('DisposalListView', () => {
  // feliz
  /* A tela existe para responder "o que saiu, e por quê" — o motivo é a coluna principal. */
  it('shows why each machine left, and when', () => {
    renderView();

    /* Dentro da TABELA: "Com defeito" também é o rótulo de um dos cartões do topo, e o que
       este teste precisa provar é a linha da máquina. */
    const list = within(screen.getByRole('table'));

    expect(list.getByText('Fonte queimada duas vezes no mesmo semestre.')).toBeInTheDocument();
    expect(list.getByText('Com defeito')).toBeInTheDocument();
    expect(list.getByText('09/08/2026')).toBeInTheDocument();
  });

  it('asks before putting a machine back, saying what changes', async () => {
    const user = userEvent.setup();
    renderView({ restoring: computer() });

    const dialog = screen.getByRole('dialog');

    expect(within(dialog).getByText(/o motivo do descarte é apagado/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Voltar ao inventário' }));

    expect(actions.onConfirmRestore).toHaveBeenCalled();
  });

  // triste
  /* Nada descartado é boa notícia, e o texto diz ONDE a ação acontece — descartar é na
     ficha da máquina, não aqui. */
  it('explains where disposal happens when the list is empty', () => {
    renderView({ computers: [], state: { isEmpty: true } });

    expect(screen.getByText('Nenhuma máquina descartada')).toBeInTheDocument();
    expect(screen.getByText(/pela ficha dele, no Inventário/)).toBeInTheDocument();
  });

  it('offers to clear the filters when they hid everything', () => {
    renderView({ computers: [], state: { isFilteredOut: true } });

    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument();
  });

  it('shows the reason the list did not load', () => {
    renderView({ computers: [], state: { error: 'Não consegui falar com o servidor.' } });

    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('Não consegui falar com o servidor.');
  });

  it('keeps the failure of a restore on screen, with the reason', () => {
    renderView({ state: { actionError: 'Você não tem permissão para alterar o cadastro.' } });

    expect(screen.getAllByRole('alert')[0]).toHaveTextContent(
      'Você não tem permissão para alterar o cadastro.',
    );
  });

  it('does not announce an empty list while it is still loading', () => {
    renderView({ computers: [], state: { isLoading: true } });

    expect(screen.getByText('Carregando o que saiu de uso…')).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma máquina descartada')).not.toBeInTheDocument();
  });
});
