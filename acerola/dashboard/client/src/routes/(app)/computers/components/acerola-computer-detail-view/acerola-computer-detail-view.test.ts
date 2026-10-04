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
  coreCountOf,
  hardwareFacts,
  nowReadingOf,
  totalDiskPercentOf,
  transferRouteOf,
} from './acerola-computer-detail-view.svelte';

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
  onAlertPageChange: vi.fn(),
  onTicketPageChange: vi.fn(),
};

/** As duas listas paginadas: uma página de 25, e o total que o servidor devolveu. */
const paging = { page: 1, pageSize: 25, total: 1 };

function renderDetail(over: Partial<Computer> = {}) {
  return render(ComputerDetailView, {
    props: {
      data: {
        computer: computer(over),
        samples,
        live: null,
        tickets: [],
        alerts: [alert()],
        alertPaging: paging,
        ticketPaging: { ...paging, total: 0 },
        maintenances: [],
        partMovements: [],
        transfers: [],
      },
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
          live: null,
          tickets: [],
          alerts: [],
          alertPaging: { ...paging, total: 0 },
          ticketPaging: { ...paging, total: 0 },
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

    expect(facts.find((fact) => fact.label === 'Disco')?.value).toBe('14,0 GB livres de 500,0 GB');
  });

  /* Os dois números de núcleo aparecem na ficha, e não só o lógico. */
  it('shows the physical cores next to the logical ones', () => {
    const facts = hardwareFacts(computer());

    expect(facts.find((fact) => fact.label === 'Núcleos')?.value).toMatch(/lógicos/);
  });

  // triste
  /* Nulo é "o agente ainda não mediu". Virar "0 B" diria que a máquina tem disco de tamanho
     zero, que é outra coisa — e leva a decisão de compra diferente. */
  it('says it does not know yet instead of reporting zeros', () => {
    const facts = hardwareFacts(neverSeen());

    expect(facts.find((fact) => fact.label === 'Disco')?.value).toBe('—');
    expect(facts.find((fact) => fact.label === 'Memória')?.value).toBe('—');
    expect(facts.find((fact) => fact.label === 'Núcleos')?.value).toBe('—');
    expect(facts.find((fact) => fact.label === 'Versão do agente')?.value).toBe('—');
  });
});

describe('coreCountOf', () => {
  // feliz
  /**
   * Só o lógico ENGANA, e o engano tem consequência: um i5 de 6 núcleos com hyper-threading
   * aparece como 12, e quem lê "12 núcleos" acha que a máquina é o dobro do que é — na hora
   * de comprar, e na hora de culpar a máquina pela lentidão.
   */
  it('says the physical cores and the logical ones, both', () => {
    expect(coreCountOf(6, 12)).toBe('6 físicos · 12 lógicos');
  });

  // triste
  /* Agente antigo, ou máquina virtual que esconde o físico: a tela diz o que sabe em vez de
     inventar o que falta. */
  it('says only what it knows when one of the two is missing', () => {
    expect(coreCountOf(null, 12)).toBe('12 lógicos');
    expect(coreCountOf(6, null)).toBe('6 físicos');
  });

  it('says it does not know when neither was reported (edge case)', () => {
    expect(coreCountOf(null, null)).toBe('—');
    expect(coreCountOf(0, 0)).toBe('—');
  });
});

describe('totalDiskPercentOf', () => {
  // feliz
  /* Somar os volumes é a MESMA conta que o servidor usa para a amostra guardada: duas contas
     diferentes fariam o cartão pular ao agente cair, sem nada ter mudado na máquina. */
  it('adds the volumes up instead of picking the worst one', () => {
    const disks = [
      { mountpoint: 'C:', fstype: 'NTFS', totalBytes: 100, usedBytes: 90, freeBytes: 10, usedPercent: 90 },
      { mountpoint: 'D:', fstype: 'NTFS', totalBytes: 100, usedBytes: 10, freeBytes: 90, usedPercent: 10 },
    ];

    expect(totalDiskPercentOf(disks)).toBe(50);
  });

  // triste
  /* Sem volume não há proporção: dividir por zero daria `NaN` no cartão. */
  it('answers nothing when the reading brought no volume (edge case)', () => {
    expect(totalDiskPercentOf([])).toBeNull();
  });
});

describe('nowReadingOf', () => {
  const live = {
    computerId: 11,
    measuredAt: '2026-09-29T14:11:00.000-03:00',
    receivedAt: '2026-09-29T17:11:00.000Z',
    isOnline: true,
    cpu: { percentTotal: 37, percentPerCore: [] },
    memory: {
      totalBytes: 16,
      usedBytes: 13,
      freeBytes: 3,
      usedPercent: 85,
      swapTotalBytes: 0,
      swapUsedBytes: 0,
      swapUsedPercent: 0,
    },
    disks: [
      { mountpoint: 'C:', fstype: 'NTFS', totalBytes: 100, usedBytes: 70, freeBytes: 30, usedPercent: 70 },
    ],
    diskIo: { readBytesPerSec: 0, writeBytesPerSec: 0 },
    network: [],
    processes: [],
  };

  const stale: ComputerSample = {
    sampledAt: '2026-09-29T13:40:00.000Z',
    cpuPercent: 100,
    memoryPercent: 90,
    diskPercent: 70,
    networkBytesPerSec: 0,
  };

  // feliz
  /**
   * O DEFEITO QUE ESTE TESTE TRANCA.
   *
   * Os cartões liam a última AMOSTRA gravada — um resumo de minutos atrás — e escreviam
   * "agora" em cima dela. O painel ao vivo, um centímetro abaixo, mostrava outro número. A
   * leitura do segundo manda sempre que existe.
   */
  it('prefers the live reading over the sample that was stored minutes ago', () => {
    const reading = nowReadingOf(live, stale);

    expect(reading.cpuPercent).toBe(37);
    expect(reading.memoryPercent).toBe(85);
    expect(reading.isLive).toBe(true);
  });

  // triste
  /* Agente fora do ar: sobra o retrato guardado — e quem chama precisa saber que é retrato,
     para parar de escrever "agora" em cima dele. */
  it('falls back to the stored sample and says it is not live', () => {
    const reading = nowReadingOf(null, stale);

    expect(reading.cpuPercent).toBe(100);
    expect(reading.isLive).toBe(false);
  });

  /* Máquina recém-cadastrada: nada ao vivo e nada guardado. Vazio, e não zero — zero diria
     que a máquina está ligada e ociosa. */
  it('answers nothing when there is neither a live reading nor a sample (edge case)', () => {
    const reading = nowReadingOf(null, null);

    expect(reading).toEqual({
      cpuPercent: null,
      memoryPercent: null,
      diskPercent: null,
      isLive: false,
    });
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

describe('AcerolaComputerDetailView', () => {
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
        data: {
          computer: neverSeen(),
          samples: [],
          live: null,
          tickets: [],
          alerts: [],
          alertPaging: { ...paging, total: 0 },
          ticketPaging: { ...paging, total: 0 },
          maintenances: [],
          partMovements: [],
          transfers: [],
        },
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
          live: null,
          tickets: [],
          alerts: [],
          alertPaging: { ...paging, total: 0 },
          ticketPaging: { ...paging, total: 0 },
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
