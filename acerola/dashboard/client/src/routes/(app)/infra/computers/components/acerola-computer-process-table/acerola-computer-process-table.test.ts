import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import ComputerProcessTable from './acerola-computer-process-table.svelte';

type Process = {
  name: string;
  instanceCount: number;
  cpuPercent: number;
  memPercent: number;
  memBytes: number;
  instances: [];
};

function process(over: Partial<Process> = {}): Process {
  return {
    name: 'chrome.exe',
    instanceCount: 1,
    cpuPercent: 12,
    memPercent: 8,
    memBytes: 1_073_741_824,
    instances: [],
    ...over,
  };
}

describe('AcerolaComputerProcessTable', () => {
  // feliz
  it('lists each application with what it is consuming', () => {
    render(ComputerProcessTable, {
      props: { data: { processes: [process({ name: 'chrome.exe', cpuPercent: 12 })] } },
    });

    expect(screen.getByText(/chrome\.exe/)).toBeInTheDocument();
    expect(screen.getByText('12%')).toBeInTheDocument();
    expect(screen.getByText('1,0 GB')).toBeInTheDocument();
  });

  /* O Chrome abre um processo por aba: dizer quantos são explica um número de memória que,
     de outro modo, pareceria absurdo para um "programa só". */
  it('says how many processes an application opened when there is more than one', () => {
    render(ComputerProcessTable, {
      props: { data: { processes: [process({ instanceCount: 14 })] } },
    });

    expect(screen.getByText('(14 processos)')).toBeInTheDocument();
  });

  it('does not say anything about processes when the application opened just one', () => {
    render(ComputerProcessTable, {
      props: { data: { processes: [process({ instanceCount: 1 })] } },
    });

    expect(screen.queryByText(/processos\)/)).not.toBeInTheDocument();
  });

  /* Lista nunca é truncada calada (CONTRIBUTING §15): o que sobrou é dito com todas as letras. */
  it('says how many applications were left out of the list', () => {
    const processes = Array.from({ length: 13 }, (_value, index) =>
      process({ name: `app-${index}.exe` }),
    );

    render(ComputerProcessTable, { props: { data: { processes }, ui: { limit: 10 } } });

    expect(screen.getByText(/e mais 3 aplicativos com consumo menor/)).toBeInTheDocument();
  });

  it('writes the leftover in the singular when only one was left out (edge case)', () => {
    const processes = Array.from({ length: 3 }, (_value, index) =>
      process({ name: `app-${index}.exe` }),
    );

    render(ComputerProcessTable, { props: { data: { processes }, ui: { limit: 2 } } });

    expect(screen.getByText(/e mais 1 aplicativo com consumo menor/)).toBeInTheDocument();
  });

  // triste
  /* Vazio só é vazio depois que a leitura terminou (CONTRIBUTING §15). */
  it('says it is reading instead of saying the machine has no application', () => {
    render(ComputerProcessTable, {
      props: { data: { processes: [] }, state: { isLoading: true } },
    });

    expect(screen.getByText('Lendo a máquina…')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('says the reading brought no application instead of drawing an empty table', () => {
    render(ComputerProcessTable, { props: { data: { processes: [] } } });

    expect(screen.getByText('Nenhum aplicativo informado nesta leitura.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
