import { type Part, type PartMovement } from '@template/shared/schemas/part.schema';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import PartLedgerDialog, {
  currentBalanceOf,
  destinationOf,
  signedQuantity,
} from './part-ledger-dialog.svelte';

function part(over: Partial<Part> = {}): Part {
  return {
    id: 1,
    name: 'SSD 240 GB Kingston',
    category: 'ssd',
    condition: 'new',
    balance: 3,
    createdAt: '2026-09-01T12:00:00.000Z',
    createdBy: 'suporte@azuos.local',
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

function movement(over: Partial<PartMovement> = {}): PartMovement {
  return {
    id: 10,
    partId: 1,
    partName: 'SSD 240 GB Kingston',
    partCondition: 'new',
    type: 'out',
    quantity: 1,
    balanceAfter: 3,
    computerId: 3,
    computerName: 'CONTABIL-03',
    computerDisplayName: 'Contábil — fechamento',
    computerDepartment: 'contabil',
    handledBy: 'Suporte TI',
    note: 'Instalado na máquina do fechamento.',
    createdAt: '2026-09-20T12:00:00.000Z',
    createdBy: 'suporte@azuos.local',
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

const actions = {
  onAskRemove: vi.fn(),
  onCancelRemove: vi.fn(),
  onConfirmRemove: vi.fn(),
  onRetry: vi.fn(),
  onClose: vi.fn(),
};

describe('destinationOf', () => {
  // feliz
  it('reads the machine by the nickname, with the department along', () => {
    expect(destinationOf(movement())).toBe('Contábil — fechamento · CONTÁBIL');
  });

  // triste
  /* Movimentação sem máquina é o caso normal — uma compra, uma devolução ao depósito. */
  it('shows a dash when the movement has no machine', () => {
    expect(destinationOf(movement({ computerId: null }))).toBe('—');
  });
});

describe('signedQuantity', () => {
  // feliz
  /* O sinal é o que se lê de relance na coluna: o que entrou e o que saiu. */
  it('signs the quantity by the direction of the movement', () => {
    expect(signedQuantity(movement({ type: 'in', quantity: 5 }))).toBe('+5');
    expect(signedQuantity(movement({ type: 'out', quantity: 2 }))).toBe('−2');
  });
});

describe('currentBalanceOf', () => {
  // feliz
  /* A linha mais recente é a verdade: excluir uma movimentação com o diálogo aberto mudaria
     o extrato, e um cabeçalho preso no cadastro anunciaria um saldo já desmentido abaixo. */
  it('reads the balance from the newest line of the ledger', () => {
    const data = {
      part: part({ balance: 99 }),
      movements: [movement({ balanceAfter: 2 }), movement({ id: 9, balanceAfter: 3 })],
    };

    expect(currentBalanceOf(data)).toBe(2);
  });

  // triste
  it('falls back to the part when there is no ledger to read', () => {
    expect(currentBalanceOf({ part: part({ balance: 4 }), movements: [] })).toBe(4);
  });
});

describe('PartLedgerDialog', () => {
  // feliz
  it('shows the balance after each line, like a bank statement', () => {
    render(PartLedgerDialog, {
      props: {
        data: {
          part: part(),
          movements: [movement({ id: 1, balanceAfter: 3 }), movement({ id: 2, balanceAfter: 4 })],
          removing: null,
        },
        actions,
      },
    });

    /* Dentro da TABELA: o saldo atual também aparece no cabeçalho do diálogo, e o que este
       teste precisa provar é a coluna que explica como se chegou nele. */
    const ledger = within(screen.getByRole('table'));

    expect(ledger.getByText('3')).toBeInTheDocument();
    expect(ledger.getByText('4')).toBeInTheDocument();
  });

  it('asks before deleting, explaining that the balance comes back', async () => {
    const user = userEvent.setup();
    render(PartLedgerDialog, {
      props: { data: { part: part(), movements: [movement()], removing: movement() }, actions },
    });

    const confirmation = screen.getByText('Excluir esta movimentação?').closest('div');

    expect(confirmation).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Excluir e devolver o saldo' }));

    expect(actions.onConfirmRemove).toHaveBeenCalled();
  });

  // triste
  /* Peça sem movimentação nenhuma: o texto diz isso, em vez de uma tabela vazia. */
  it('says the part has no movement instead of showing an empty table', () => {
    render(PartLedgerDialog, {
      props: { data: { part: part({ balance: 0 }), movements: [], removing: null }, actions },
    });

    expect(
      screen.getByText('Esta peça ainda não teve entrada nem saída registrada.'),
    ).toBeInTheDocument();
  });

  it('shows the reason the ledger did not load', () => {
    render(PartLedgerDialog, {
      props: {
        data: { part: part(), movements: [], removing: null },
        state: { error: 'Não consegui falar com o servidor.' },
        actions,
      },
    });

    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('Não consegui falar com o servidor.');
  });

  it('keeps the failure of a delete on screen, with the reason', () => {
    render(PartLedgerDialog, {
      props: {
        data: { part: part(), movements: [movement()], removing: null },
        state: { actionError: 'Esta movimentação é de outra pessoa.' },
        actions,
      },
    });

    expect(screen.getAllByRole('alert')[0]).toHaveTextContent(
      'Esta movimentação é de outra pessoa.',
    );
  });

  it('does not announce an empty ledger while it is still loading', () => {
    render(PartLedgerDialog, {
      props: {
        data: { part: part(), movements: [], removing: null },
        state: { isLoading: true },
        actions,
      },
    });

    expect(screen.getByText('Carregando o histórico…')).toBeInTheDocument();
  });
});
