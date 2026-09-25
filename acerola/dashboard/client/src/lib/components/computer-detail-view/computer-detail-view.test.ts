import {
  type Computer,
  type ComputerAlert,
  type ComputerSample,
} from '@template/shared/schemas/computer.schema';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ComputerDetailView, {
  alertDurationLabel,
  hardwareFacts,
  transferRouteOf,
} from './computer-detail-view.svelte';

const transfer = {
  id: 1,
  computerId: 3,
  fromDepartment: 'recepcao' as const,
  toDepartment: 'contabil' as const,
  responsible: 'Coordenação contábil',
  note: 'A recepção recebeu a máquina nova.',
  peripheralsLeftBehind: 2,
  createdAt: '2026-06-01T12:00:00.000Z',
  createdBy: 'suporte@azuos.local',
};

const GB = 1024 ** 3;

function computer(over: Partial<Computer> = {}): Computer {
  return {
    id: 3,
    name: 'CONTABIL-03',
    displayName: 'Contábil — mesa do fechamento',
    responsibleName: 'Daniela Prado',
    department: 'contabil',
    hardware: {
      os: 'Microsoft Windows 11 Pro',
      platform: 'windows',
      platformVersion: '10.0.26100',
      kernelVersion: '10.0.26100',
      arch: 'amd64',
      cpuModel: 'AMD Ryzen 5 5600G',
      logicalCpus: 12,
      physicalCpus: 6,
      totalMemoryBytes: 8 * GB,
      macAddress: '00:00:5E:00:53:03',
      localIp: '198.51.100.13',
      totalDiskBytes: 500 * GB,
      freeDiskBytes: 14 * GB,
      uptimeSeconds: 47 * 24 * 60 * 60,
      bootTime: '2026-08-07T09:00:00.000Z',
    },
    healthScore: 63,
    healthStatus: 'critical',
    warnings: [{ severity: 'critical', message: 'Disco quase cheio: só 2,8% livre' }],
    isOnline: true,
    lastSeenAt: '2026-09-23T11:59:00.000Z',
    agentVersion: '1.0.0',
    isArchived: false,
    isBlocked: false,
    blockReason: null,
    disposedAt: null,
    disposalType: null,
    disposalReason: null,
    createdAt: '2026-05-01T12:00:00.000Z',
    createdBy: 'suporte@azuos.local',
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

/** Máquina cadastrada cujo agente nunca conectou: hardware inteiro em branco. */
function neverSeen(): Computer {
  return computer({
    id: 4,
    name: 'FISCAL-04',
    displayName: null,
    warnings: [],
    healthScore: 100,
    healthStatus: 'good',
    isOnline: false,
    lastSeenAt: null,
    agentVersion: null,
    hardware: {
      os: null,
      platform: null,
      platformVersion: null,
      kernelVersion: null,
      arch: null,
      cpuModel: null,
      logicalCpus: null,
      physicalCpus: null,
      totalMemoryBytes: null,
      macAddress: null,
      localIp: null,
      totalDiskBytes: null,
      freeDiskBytes: null,
      uptimeSeconds: null,
      bootTime: null,
    },
  });
}

function alert(over: Partial<ComputerAlert> = {}): ComputerAlert {
  return {
    id: 1,
    computerId: 3,
    metric: 'disk',
    peakValue: 97.2,
    threshold: 90,
    status: 'active',
    startedAt: '2026-09-22T16:00:00.000Z',
    recoveredAt: null,
    causeProcess: 'OneDrive.exe',
    ...over,
  };
}

const samples: ComputerSample[] = [
  {
    sampledAt: '2026-09-23T11:55:00.000Z',
    cpuPercent: 35,
    memoryPercent: 71,
    diskPercent: 97,
    networkBytesPerSec: 120000,
  },
];

const actions = {
  onEdit: vi.fn(),
  onRegisterMaintenance: vi.fn(),
  onArchivedChange: vi.fn(),
  onBlockedChange: vi.fn(),
  onRegenerateToken: vi.fn(),
  onDispose: vi.fn(),
  onRestore: vi.fn(),
  onBack: vi.fn(),
  onTransfer: vi.fn(),
};

function renderDetail(over: Partial<Computer> = {}) {
  return render(ComputerDetailView, {
    props: {
      data: { computer: computer(over), samples, alerts: [alert()], maintenances: [], partMovements: [], transfers: [] },
      actions,
    },
  });
}

describe('transferRouteOf', () => {
  // feliz
  it('reads the move in one line', () => {
    expect(transferRouteOf(transfer)).toBe('RECEPÇÃO → CONTÁBIL');
  });

  // triste
  /* "Saiu do nada para o fiscal" não é frase que alguém entenda: a prateleira tem nome. */
  it('gives the shelf a name on both sides', () => {
    expect(transferRouteOf({ ...transfer, fromDepartment: null })).toBe(
      'Sem departamento → CONTÁBIL',
    );
    expect(transferRouteOf({ ...transfer, toDepartment: null })).toBe(
      'RECEPÇÃO → Sem departamento',
    );
  });
});

describe('o histórico de transferências', () => {
  // feliz
  it('shows where the machine came from and what stayed behind', () => {
    render(ComputerDetailView, {
      props: {
        data: {
          computer: computer(),
          samples: [],
          alerts: [],
          maintenances: [],
          partMovements: [],
          transfers: [transfer],
        },
        actions,
      },
    });

    expect(screen.getByText('RECEPÇÃO → CONTÁBIL')).toBeInTheDocument();
    expect(screen.getByText('2 peça(s) ficaram')).toBeInTheDocument();
  });

  // triste
  /* Sem histórico a tela diz por onde começar, em vez de ficar em branco. */
  it('tells where the history comes from when there is none', () => {
    renderDetail();

    expect(screen.getByText(/Nenhuma transferência registrada/)).toBeInTheDocument();
  });
});

describe('hardwareFacts', () => {
  // feliz
  it('reads the disk as free space out of the total', () => {
    const facts = hardwareFacts(computer());

    expect(facts.find((fact) => fact.label === 'Disco')?.value).toBe(
      '14,0 GB livres de 500,0 GB',
    );
  });

  // triste
  /* Nulo é "o agente ainda não mediu". Virar "0 B" diria que a máquina tem disco de tamanho
     zero, que é outra coisa — e leva a decisão de compra diferente. */
  it('says it does not know yet instead of reporting zeros', () => {
    const facts = hardwareFacts(neverSeen());

    expect(facts.find((fact) => fact.label === 'Disco')?.value).toBe('—');
    expect(facts.find((fact) => fact.label === 'Memória')?.value).toBe('—');
    expect(facts.find((fact) => fact.label === 'Versão do agente')?.value).toBe('—');
  });
});

describe('alertDurationLabel', () => {
  // feliz
  it('says how long a finished episode lasted', () => {
    expect(
      alertDurationLabel(alert({ recoveredAt: '2026-09-22T16:35:00.000Z', status: 'recovered' })),
    ).toBe('35 min');
  });

  // triste
  /* Episódio sem fim é problema ACONTECENDO. Mostrar "0 min" diria que já passou. */
  it('says an unfinished episode is happening now', () => {
    expect(alertDurationLabel(alert())).toBe('Acontecendo agora');
  });
});

describe('ComputerDetailView', () => {
  // feliz
  it('puts what needs attention before everything else', () => {
    renderDetail();

    expect(screen.getByText('Disco quase cheio: só 2,8% livre')).toBeInTheDocument();
  });

  it('asks before archiving, and only then archives', async () => {
    const user = userEvent.setup();
    renderDetail();

    await user.click(screen.getByRole('button', { name: 'Arquivar' }));
    expect(actions.onArchivedChange).not.toHaveBeenCalled();

    /* O botão da pergunta, e não o da barra de ações: os dois dizem o mesmo verbo de
       propósito, para quem lê só o botão saber o que vai acontecer. */
    const confirmation = screen.getByRole('dialog');
    await user.click(within(confirmation).getByRole('button', { name: 'Arquivar' }));

    expect(actions.onArchivedChange).toHaveBeenCalledWith(true);
  });

  it('offers to take the machine out of the archive once it is archived', () => {
    renderDetail({ isArchived: true });

    expect(screen.getByRole('button', { name: 'Tirar do arquivo' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Arquivar' })).not.toBeInTheDocument();
  });

  // triste
  /* Máquina sem medida nenhuma não pode mostrar "0%" como se estivesse parada. */
  it('shows a dash for the current usage of a machine that never reported', () => {
    render(ComputerDetailView, {
      props: {
        data: { computer: neverSeen(), samples: [], alerts: [], maintenances: [], partMovements: [], transfers: [] },
        actions,
      },
    });

    expect(screen.getByText('Esta máquina ainda não enviou nenhuma leitura.')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  /* Gravação que falha calada vira "o sistema não salva" (CONTRIBUTING §15). */
  it('keeps the failure of an action on screen, with the reason', () => {
    render(ComputerDetailView, {
      props: {
        data: {
          computer: computer(),
          samples,
          alerts: [],
          maintenances: [],
          partMovements: [],
          transfers: [],
        },
        state: { actionError: 'Você não tem permissão para alterar o cadastro.' },
        actions,
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Você não tem permissão para alterar o cadastro.',
    );
  });

  it('shows why a machine was blocked, not only that it was', () => {
    renderDetail({ isBlocked: true, blockReason: 'Máquina devolvida ao fornecedor.' });

    expect(screen.getByText('Máquina devolvida ao fornecedor.')).toBeInTheDocument();
  });
});
