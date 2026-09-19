import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialog, type ConfirmDialogProps } from './confirm-dialog.component';

function renderDialog(overrides: Partial<ConfirmDialogProps> = {}) {
  const actions = { onConfirm: vi.fn(), onCancel: vi.fn() };

  render(
    <ConfirmDialog
      data={{
        title: 'Excluir esta tarefa?',
        description: 'Não dá para desfazer.',
        confirmLabel: 'Excluir tarefa',
      }}
      state={{ isOpen: true }}
      actions={actions}
      {...overrides}
    />,
  );

  return actions;
}

describe('ConfirmDialog', () => {
  // feliz
  it('confirms through a button that names the action', async () => {
    const actions = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: 'Excluir tarefa' }));

    expect(actions.onConfirm).toHaveBeenCalledOnce();
  });

  it('cancels', async () => {
    const actions = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(actions.onCancel).toHaveBeenCalledOnce();
  });

  // triste
  it('shows the refusal inside the dialog', () => {
    renderDialog({
      state: { isOpen: true, error: 'Excluir tarefas é uma ação de administrador.' },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('ação de administrador');
  });

  /* A requisição já saiu: cancelar ou confirmar de novo esconderia o resultado ou duplicaria. */
  it('locks both buttons while confirming', () => {
    renderDialog({ state: { isOpen: true, isConfirming: true } });

    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Excluir tarefa' })).toBeDisabled();
  });

  it('renders nothing when closed', () => {
    renderDialog({ state: { isOpen: false } });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
