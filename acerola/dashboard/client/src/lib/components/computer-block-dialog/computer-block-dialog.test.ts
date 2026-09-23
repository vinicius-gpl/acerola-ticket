import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ComputerBlockDialog from './computer-block-dialog.svelte';

const data = { computerName: 'CS-06' };

describe('ComputerBlockDialog', () => {
  // feliz
  it('hands over the reason that was typed', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(ComputerBlockDialog, {
      props: { data, state: { isOpen: true }, actions: { onConfirm, onCancel: vi.fn() } },
    });

    await user.type(screen.getByLabelText('Motivo'), 'Máquina devolvida ao fornecedor');
    await user.click(screen.getByRole('button', { name: 'Bloquear' }));

    expect(onConfirm).toHaveBeenCalledWith('Máquina devolvida ao fornecedor');
  });

  it('explains what blocking does before it happens', () => {
    render(ComputerBlockDialog, {
      props: {
        data,
        state: { isOpen: true },
        actions: { onConfirm: vi.fn(), onCancel: vi.fn() },
      },
    });

    expect(screen.getByText(/passa a ser recusado/)).toBeInTheDocument();
  });

  // triste
  /* Bloquear sem motivo é permitido — o motivo ajuda, mas exigir texto travaria um
     bloqueio urgente, que é justamente quando ele mais importa. */
  it('allows blocking with no reason written', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(ComputerBlockDialog, {
      props: { data, state: { isOpen: true }, actions: { onConfirm, onCancel: vi.fn() } },
    });

    await user.click(screen.getByRole('button', { name: 'Bloquear' }));

    expect(onConfirm).toHaveBeenCalledWith('');
  });

  it('shows the reason the server refused, without closing', () => {
    render(ComputerBlockDialog, {
      props: {
        data,
        state: { isOpen: true, error: 'Você não tem permissão para bloquear máquinas.' },
        actions: { onConfirm: vi.fn(), onCancel: vi.fn() },
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Você não tem permissão para bloquear máquinas.',
    );
  });
});
