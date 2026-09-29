import { ForbiddenException } from '@nestjs/common';
import { type BudgetNeedKey } from '@template/shared/domain/budget-need.util';
import { type Budget } from '@template/shared/schemas/budget.schema';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import {
  type BudgetComputerRow,
  type BudgetRepository,
  type StockRow,
} from '../repository/budget.repository';
import { BudgetService } from './budget.service';

const ana: RequestUser = { id: '1', email: 'ana@empresa.com.br', name: 'Ana', role: 'user' };

/* Identidade PELA METADE: chegou sem papel. O contrato não admite, e é por isso que o teste
   precisa forçar — a recusa existe justamente para o que não devia chegar. */
const noRole = { ...ana, role: undefined } as unknown as RequestUser;

const GB = 1024 ** 3;

function computerRow(over: Partial<BudgetComputerRow> = {}): BudgetComputerRow {
  return {
    computerId: 1,
    computerName: 'RECEPCAO-01',
    computerDisplayName: 'Recepção — balcão',
    department: 'recepcao',
    totalMemoryBytes: 16 * GB,
    totalDiskBytes: 480 * GB,
    freeDiskBytes: 240 * GB,
    maintenanceCount: 0,
    ...over,
  };
}

function makeService(repository: { computers?: BudgetComputerRow[]; stock?: StockRow[] } = {}) {
  const base = {
    computers: vi.fn().mockResolvedValue(repository.computers ?? []),
    stock: vi.fn().mockResolvedValue(repository.stock ?? []),
  };

  return new BudgetService(base as unknown as BudgetRepository);
}

function needOf(budget: Budget, key: BudgetNeedKey) {
  return budget.needs.find((need) => need.key === key);
}

describe('BudgetService.summary', () => {
  // feliz
  it('counts who needs memory and discounts the storeroom', async () => {
    const service = makeService({
      computers: [
        computerRow({ computerId: 1, computerName: 'FRACA-01', totalMemoryBytes: 4 * GB }),
        computerRow({ computerId: 2, computerName: 'FRACA-02', totalMemoryBytes: 4 * GB }),
        computerRow({ computerId: 3, computerName: 'FRACA-03', totalMemoryBytes: 2 * GB }),
        computerRow({ computerId: 4, computerName: 'BOA-04', totalMemoryBytes: 16 * GB }),
      ],
      stock: [{ category: 'memory', balance: 2 }],
    });

    const memory = needOf(await service.summary(ana), 'memory');

    expect(memory?.needed).toBe(3);
    expect(memory?.inStock).toBe(2);
    expect(memory?.toBuy).toBe(1);
  });

  /* A lista sustenta o número, e a mais apertada vem primeiro: é ela que alguém vai atender. */
  it('lists who needs it, the tightest one first', async () => {
    const service = makeService({
      computers: [
        computerRow({ computerId: 1, computerName: 'FRACA-01', totalMemoryBytes: 4 * GB }),
        computerRow({ computerId: 2, computerName: 'PIOR-02', totalMemoryBytes: 2 * GB }),
      ],
    });

    const memory = needOf(await service.summary(ana), 'memory');

    expect(memory?.machines.map((machine) => machine.computerName)).toEqual([
      'PIOR-02',
      'FRACA-01',
    ]);
    expect(memory?.machines[0]?.value).toBe(2);
  });

  it('counts the machine with the disk running out', async () => {
    const service = makeService({
      computers: [
        computerRow({ totalDiskBytes: 480 * GB, freeDiskBytes: 24 * GB }),
        computerRow({ computerId: 2, totalDiskBytes: 480 * GB, freeDiskBytes: 240 * GB }),
      ],
    });

    const disk = needOf(await service.summary(ana), 'disk');

    expect(disk?.needed).toBe(1);
    expect(disk?.machines[0]?.value).toBe(5);
  });

  it('counts the machine that already ate three maintenances', async () => {
    const service = makeService({
      computers: [
        computerRow({ computerId: 1, computerName: 'TRANQUILA-01', maintenanceCount: 2 }),
        computerRow({ computerId: 2, computerName: 'TRABALHOSA-02', maintenanceCount: 4 }),
      ],
      stock: [{ category: 'desktop', balance: 1 }],
    });

    const computer = needOf(await service.summary(ana), 'computer');

    expect(computer?.machines.map((machine) => machine.computerName)).toEqual(['TRABALHOSA-02']);
    expect(computer?.toBuy).toBe(0);
  });

  /* Diferente da Inteligência de propósito: lá a máquina apertada dos dois lados aparece uma
     vez, com a recomendação mais barata. Aqui são duas peças a comprar. */
  it('asks for both parts when the same machine is tight on memory and disk', async () => {
    const service = makeService({
      computers: [computerRow({ totalMemoryBytes: 4 * GB, freeDiskBytes: 24 * GB })],
    });

    const budget = await service.summary(ana);

    expect(needOf(budget, 'memory')?.needed).toBe(1);
    expect(needOf(budget, 'disk')?.needed).toBe(1);
  });

  // triste
  /* O depósito cobrindo tudo é a boa notícia da tela — a necessidade fica, zerada. */
  it('keeps a covered need on screen, with nothing to buy', async () => {
    const service = makeService({
      computers: [computerRow({ totalMemoryBytes: 4 * GB })],
      stock: [{ category: 'memory', balance: 9 }],
    });

    const memory = needOf(await service.summary(ana), 'memory');

    expect(memory?.needed).toBe(1);
    expect(memory?.toBuy).toBe(0);
  });

  /* Máquina sem medição é compra no escuro: o agente nunca conectou nela. */
  it('leaves out the machine nobody ever measured', async () => {
    const service = makeService({
      computers: [
        computerRow({ totalMemoryBytes: null, totalDiskBytes: null, freeDiskBytes: null }),
      ],
    });

    const budget = await service.summary(ana);

    expect(needOf(budget, 'memory')?.needed).toBe(0);
    expect(needOf(budget, 'disk')?.needed).toBe(0);
  });

  it('answers all three needs even with an empty park', async () => {
    const budget = await makeService().summary(ana);

    expect(budget.needs.map((need) => need.key)).toEqual(['memory', 'disk', 'computer']);
    expect(budget.needs.every((need) => need.toBuy === 0)).toBe(true);
  });

  it('refuses to answer someone without a role', async () => {
    await expect(makeService().summary(noRole)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
