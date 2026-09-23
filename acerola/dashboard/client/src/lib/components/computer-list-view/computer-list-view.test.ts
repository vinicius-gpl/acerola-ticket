import { type Computer } from '@template/shared/schemas/computer.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ComputerListView, {
  displayNameOf,
  type ComputerListFilter,
  type ComputerSummary,
} from './computer-list-view.svelte';

function computer(over: Partial<Computer> = {}): Computer {
  return {
    id: 1,
    name: 'RECEPCAO-01',
    displayName: 'Recepção — balcão',
    responsibleName: 'Bia Costa',
    department: 'recepcao',
    hardware: {
      os: 'Microsoft Windows 11 Pro',
      platform: 'windows',
      platformVersion: '10.0.26100',
      kernelVersion: '10.0.26100',
      arch: 'amd64',
      cpuModel: 'Intel Core i5-12400',
      logicalCpus: 12,
      physicalCpus: 6,
      totalMemoryBytes: 16 * 1024 ** 3,
      macAddress: '00:00:5E:00:53:01',
      localIp: '198.51.100.11',
      totalDiskBytes: 480 * 1024 ** 3,
      freeDiskBytes: 210 * 1024 ** 3,
      uptimeSeconds: 3600,
      bootTime: '2026-09-23T09:00:00.000Z',
    },
    healthScore: 100,
    healthStatus: 'good',
    warnings: [],
    isOnline: true,
    lastSeenAt: '2026-09-23T11:58:00.000Z',
    agentVersion: '1.0.0',
    isArchived: false,
    isBlocked: false,
    blockReason: null,
    createdAt: '2026-05-01T12:00:00.000Z',
    createdBy: 'suporte@azuos.local',
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

const summary: ComputerSummary = {
  total: 8,
  online: 3,
  critical: 2,
  attention: 1,
  neverSeen: 1,
};

const emptyFilter: ComputerListFilter = {
  search: '',
  department: '',
  healthStatus: '',
  includeArchived: false,
};

const actions = {
  onSearchChange: vi.fn(),
  onDepartmentChange: vi.fn(),
  onHealthStatusChange: vi.fn(),
  onArchivedChange: vi.fn(),
  onClearFilters: vi.fn(),
  onRetry: vi.fn(),
  onOpen: vi.fn(),
  onRegister: vi.fn(),
};

const settled = {
  isLoading: false,
  isEmpty: false,
  isFilteredOut: false,
  isTruncated: false,
  error: null,
};

describe('displayNameOf', () => {
  // feliz
  /* Quem procura "o computador da recepção" não sabe que ele se chama RECEPCAO-01. */
  it('prefers the nickname the IT team gave', () => {
    expect(displayNameOf(computer())).toBe('Recepção — balcão');
  });

  // triste
  it('falls back to the machine name when there is no nickname', () => {
    expect(displayNameOf(computer({ displayName: null }))).toBe('RECEPCAO-01');
  });

  it('ignores a nickname made only of spaces', () => {
    expect(displayNameOf(computer({ displayName: '   ' }))).toBe('RECEPCAO-01');
  });
});

describe('ComputerListView', () => {
  // feliz
  it('lists the machines with the nickname and the technical name', () => {
    render(ComputerListView, {
      props: {
        data: { computers: [computer()], total: 1, summary, filter: emptyFilter },
        state: settled,
        actions,
      },
    });

    expect(screen.getByText('Recepção — balcão')).toBeInTheDocument();
    expect(screen.getByText('RECEPCAO-01')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('opens the machine record when asked', async () => {
    const user = userEvent.setup();
    render(ComputerListView, {
      props: {
        data: { computers: [computer()], total: 1, summary, filter: emptyFilter },
        state: settled,
        actions,
      },
    });

    await user.click(screen.getByRole('button', { name: 'Ver ficha' }));

    expect(actions.onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  /* Arquivada e bloqueada vêm antes de online/offline: explicam por que a máquina está
     calada, e sem isso alguém sai procurando defeito onde houve decisão. */
  it('says a machine is blocked instead of just calling it offline', () => {
    render(ComputerListView, {
      props: {
        data: {
          computers: [computer({ isBlocked: true, isOnline: false })],
          total: 1,
          summary,
          filter: emptyFilter,
        },
        state: settled,
        actions,
      },
    });

    expect(screen.getByText('Bloqueada')).toBeInTheDocument();
    expect(screen.queryByText('Offline')).not.toBeInTheDocument();
  });

  // triste
  it('shows the reason when the inventory fails to load', () => {
    render(ComputerListView, {
      props: {
        data: { computers: [], total: 0, summary: null, filter: emptyFilter },
        state: { ...settled, error: 'Não consegui falar com o servidor.' },
        actions,
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui falar com o servidor.');
  });

  /* Vazio de verdade e filtro sem resultado levam a próximos passos diferentes. */
  it('offers to register the first machine when there is none', () => {
    render(ComputerListView, {
      props: {
        data: { computers: [], total: 0, summary, filter: emptyFilter },
        state: { ...settled, isEmpty: true },
        actions,
      },
    });

    expect(screen.getByText('Nenhum computador cadastrado')).toBeInTheDocument();
  });

  it('offers to clear the filters when they hid everything', () => {
    render(ComputerListView, {
      props: {
        data: { computers: [], total: 0, summary, filter: { ...emptyFilter, search: 'xyz' } },
        state: { ...settled, isFilteredOut: true },
        actions,
      },
    });

    expect(screen.getByText('Nenhum computador com esses filtros')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument();
  });

  /* Truncar calado é mentir sobre o tamanho do parque. */
  it('says the list was cut instead of hiding it', () => {
    render(ComputerListView, {
      props: {
        data: { computers: [computer()], total: 240, summary, filter: emptyFilter },
        state: { ...settled, isTruncated: true },
        actions,
      },
    });

    expect(screen.getByText(/Mostrando 1 de 240 computadores/)).toBeInTheDocument();
  });

  it('does not announce an empty inventory while it is still loading', () => {
    render(ComputerListView, {
      props: {
        data: { computers: [], total: 0, summary: null, filter: emptyFilter },
        state: { ...settled, isLoading: true },
        actions,
      },
    });

    expect(screen.getByText('Carregando os computadores…')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum computador cadastrado')).not.toBeInTheDocument();
  });
});
