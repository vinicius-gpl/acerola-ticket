import { type PreventiveDue } from '@template/shared/schemas/maintenance.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import PreventiveBoard, { machineLabelOf, pendingOf } from './preventive-board.svelte';

function row(over: Partial<PreventiveDue> = {}): PreventiveDue {
  return {
    computerId: 2,
    computerName: 'FINANCEIRO-02',
    computerDisplayName: 'Financeiro — mesa 2',
    computerDepartment: 'financeiro',
    lastDoneAt: '2026-04-20T12:00:00.000Z',
    status: 'due',
    maintenanceCount: 3,
    ...over,
  };
}

describe('machineLabelOf', () => {
  // feliz
  it('prefers the nickname the IT team gave', () => {
    expect(machineLabelOf(row())).toBe('Financeiro — mesa 2');
  });

  // triste
  it('falls back to the machine name when there is no nickname', () => {
    expect(machineLabelOf(row({ computerDisplayName: null }))).toBe('FINANCEIRO-02');
  });
});

describe('pendingOf', () => {
  // feliz
  it('keeps only what still needs doing', () => {
    const rows = [row(), row({ computerId: 1, status: 'ok' }), row({ computerId: 3, status: 'never' })];

    expect(pendingOf(rows).map((item) => item.computerId)).toEqual([2, 3]);
  });

  // triste
  it('returns nothing when the whole park is up to date', () => {
    expect(pendingOf([row({ status: 'ok' })])).toEqual([]);
  });
});

describe('PreventiveBoard', () => {
  const actions = { onRegister: vi.fn() };

  // feliz
  it('shows the overdue machine with what is known about it', () => {
    render(PreventiveBoard, { props: { data: { rows: [row()] }, actions } });

    expect(screen.getByText('Financeiro — mesa 2')).toBeInTheDocument();
    expect(screen.getByText('Vencida')).toBeInTheDocument();
    expect(screen.getByText(/já foram 3 manutenções/)).toBeInTheDocument();
  });

  it('opens the form already pointing at that machine', async () => {
    const user = userEvent.setup();
    render(PreventiveBoard, { props: { data: { rows: [row()] }, actions } });

    await user.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(actions.onRegister).toHaveBeenCalledWith(expect.objectContaining({ computerId: 2 }));
  });

  /* Uma máquina que só teve limpeza NÃO "nunca passou por manutenção" — ela passou, mas
     não pelo serviço que a régua cobra. O texto precisa dizer exatamente isso. */
  it('says which service is missing, instead of claiming nothing was ever done', () => {
    render(PreventiveBoard, {
      props: {
        data: { rows: [row({ status: 'never', lastDoneAt: null, maintenanceCount: 1 })] },
        actions,
      },
    });

    expect(screen.getByText(/sem preventiva ou corretiva registrada/)).toBeInTheDocument();
  });

  // triste
  /* O parque em dia não é uma lista vazia sem explicação: é uma boa notícia, e ela é dita. */
  it('celebrates instead of showing an empty list when everything is up to date', () => {
    render(PreventiveBoard, { props: { data: { rows: [row({ status: 'ok' })] }, actions } });

    expect(screen.getByText(/Todas as 1 máquinas estão em dia/)).toBeInTheDocument();
  });

  it('does not announce an empty park while it is still loading', () => {
    render(PreventiveBoard, {
      props: { data: { rows: [] }, state: { isLoading: true }, actions },
    });

    expect(screen.getByText('Conferindo as máquinas…')).toBeInTheDocument();
    expect(screen.queryByText(/Nenhuma máquina no inventário/)).not.toBeInTheDocument();
  });

  it('explains the empty board when there is no machine registered yet', () => {
    render(PreventiveBoard, { props: { data: { rows: [] }, actions } });

    expect(screen.getByText(/Nenhuma máquina no inventário ainda/)).toBeInTheDocument();
  });
});
