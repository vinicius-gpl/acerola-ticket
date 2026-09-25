import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ComputerDisposalDialog from './computer-disposal-dialog.svelte';

const data = { computerName: 'RECEPCAO-09' };

describe('ComputerDisposalDialog', () => {
  // feliz
  it('hands over the type and the reason that were chosen', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(ComputerDisposalDialog, {
      props: { data, state: { isOpen: true }, actions: { onConfirm, onCancel: vi.fn() } },
    });

    await user.type(screen.getByLabelText('Motivo'), 'Placa-mãe queimada');
    await user.click(screen.getByRole('button', { name: 'Descartar máquina' }));

    expect(onConfirm).toHaveBeenCalledWith({ type: 'defect', reason: 'Placa-mãe queimada' });
  });

  it('explains that nothing is deleted before it happens', () => {
    render(ComputerDisposalDialog, {
      props: {
        data,
        state: { isOpen: true },
        actions: { onConfirm: vi.fn(), onCancel: vi.fn() },
      },
    });

    expect(screen.getByText(/Nada é apagado/)).toBeInTheDocument();
  });

  // triste
  /* Uma saída sem motivo vira, meses depois, uma máquina na lista que ninguém sabe por que
     saiu — e alguém a devolve "para testar". */
  it('refuses to dispose without a reason, without calling anyone', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(ComputerDisposalDialog, {
      props: { data, state: { isOpen: true }, actions: { onConfirm, onCancel: vi.fn() } },
    });

    await user.click(screen.getByRole('button', { name: 'Descartar máquina' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('Diga por que a máquina saiu de uso')).toBeInTheDocument();
  });

  it('shows the reason the server refused, without closing', () => {
    render(ComputerDisposalDialog, {
      props: {
        data,
        state: { isOpen: true, error: 'Você não tem permissão para alterar o cadastro.' },
        actions: { onConfirm: vi.fn(), onCancel: vi.fn() },
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Você não tem permissão para alterar o cadastro.',
    );
  });
});
