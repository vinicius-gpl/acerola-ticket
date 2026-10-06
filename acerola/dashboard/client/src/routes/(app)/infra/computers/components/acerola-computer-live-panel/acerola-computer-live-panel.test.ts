import { render, screen } from '@testing-library/svelte';
import { type ComputerLive } from '@template/shared/schemas/computer-live.schema';
import { describe, expect, it } from 'vitest';

import ComputerLivePanel from './acerola-computer-live-panel.svelte';

const GB = 1024 * 1024 * 1024;

function live(over: Partial<ComputerLive> = {}): ComputerLive {
  return {
    computerId: 1,
    measuredAt: '2026-09-23T14:00:00.000-03:00',
    receivedAt: '2026-09-23T17:00:00.000Z',
    isOnline: true,
    cpu: { percentTotal: 42, percentPerCore: [30, 54] },
    memory: {
      totalBytes: 16 * GB,
      usedBytes: 12 * GB,
      freeBytes: 4 * GB,
      usedPercent: 75,
      swapTotalBytes: 0,
      swapUsedBytes: 0,
      swapUsedPercent: 0,
    },
    disks: [
      {
        mountpoint: 'C:',
        fstype: 'NTFS',
        totalBytes: 240 * GB,
        usedBytes: 200 * GB,
        freeBytes: 40 * GB,
        usedPercent: 83,
      },
    ],
    diskIo: { readBytesPerSec: 2 * 1024 * 1024, writeBytesPerSec: 512 * 1024 },
    network: [
      { name: 'Ethernet', bytesSentPerSec: 1024, bytesRecvPerSec: 4096 },
      { name: 'Loopback', bytesSentPerSec: 0, bytesRecvPerSec: 0 },
    ],
    processes: [],
    ...over,
  };
}

describe('AcerolaComputerLivePanel', () => {
  // feliz
  it('shows processor, memory, volumes and network of the reading', () => {
    render(ComputerLivePanel, { props: { data: { live: live() } } });

    expect(screen.getByText(/Processador — 42% no total/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Núcleo 1' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Núcleo 2' })).toBeInTheDocument();
    expect(screen.getByText('12,0 GB de 16,0 GB')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'C:' })).toBeInTheDocument();
    expect(screen.getByText('Ethernet')).toBeInTheDocument();
  });

  /* Listar seis adaptadores zerados esconderia a única que interessa. */
  it('leaves an idle network interface out of the list', () => {
    render(ComputerLivePanel, { props: { data: { live: live() } } });

    expect(screen.queryByText('Loopback')).not.toBeInTheDocument();
  });

  /* Num Windows sem arquivo de paginação, uma linha zerada seria ruído permanente. */
  it('shows virtual memory only when the machine has any', () => {
    render(ComputerLivePanel, { props: { data: { live: live() } } });

    expect(screen.queryByRole('progressbar', { name: /swap/ })).not.toBeInTheDocument();
  });

  it('shows virtual memory when the machine has it', () => {
    const withSwap = live({
      memory: {
        ...live().memory,
        swapTotalBytes: 8 * GB,
        swapUsedBytes: 2 * GB,
        swapUsedPercent: 25,
      },
    });

    render(ComputerLivePanel, { props: { data: { live: withSwap } } });

    expect(screen.getByRole('progressbar', { name: 'Memória virtual (swap)' })).toBeInTheDocument();
  });

  // triste
  /* Nulo é "o agente nunca conectou aqui" — outra conversa, com outro botão. Um painel zerado
     seria indistinguível de uma máquina ligada e ociosa. */
  it('says the agent has never reported instead of drawing zeros', () => {
    render(ComputerLivePanel, { props: { data: { live: null } } });

    expect(screen.getByText('Nada sendo medido ainda')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  /* Vazio só é vazio depois que a leitura terminou (CONTRIBUTING §15). */
  it('says it is reading instead of saying nothing was ever measured', () => {
    render(ComputerLivePanel, { props: { data: { live: null }, state: { isLoading: true } } });

    expect(screen.getByText('Lendo a máquina…')).toBeInTheDocument();
    expect(screen.queryByText('Nada sendo medido ainda')).not.toBeInTheDocument();
  });

  /* Agente antigo não informa núcleo nenhum: a tela diz isso, em vez de mostrar um espaço em
     branco que parece defeito da própria tela. */
  it('says the agent does not report per-core use (edge case)', () => {
    render(ComputerLivePanel, {
      props: { data: { live: live({ cpu: { percentTotal: 42, percentPerCore: [] } }) } },
    });

    expect(
      screen.getByText('Esta versão do agente não informa o uso por núcleo.'),
    ).toBeInTheDocument();
  });

  it('says there is no volume and no traffic when the reading brought none (edge case)', () => {
    render(ComputerLivePanel, { props: { data: { live: live({ disks: [], network: [] }) } } });

    expect(screen.getByText('Nenhum volume informado.')).toBeInTheDocument();
    expect(screen.getByText('Sem tráfego neste instante.')).toBeInTheDocument();
  });
});
