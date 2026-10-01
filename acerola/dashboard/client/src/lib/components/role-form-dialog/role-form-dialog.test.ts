import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import RoleFormDialog, { type RoleFormDialogProps } from './role-form-dialog.svelte';

const fields = {
  userId: { value: '', error: null },
  userEmail: { value: '', error: null },
  context: { value: 'sistema', error: null },
  role: { value: 'user', error: null },
};

function renderDialog(overrides: Partial<RoleFormDialogProps> = {}) {
  const actions = { onChange: vi.fn(), onBlur: vi.fn(), onSubmit: vi.fn(), onClose: vi.fn() };

  render(RoleFormDialog, {
    props: {
      data: { mode: 'create', fields },
      state: { isOpen: true },
      actions,
      ...overrides,
    },
  });

  return actions;
}

describe('RoleFormDialog', () => {
  // feliz
  it('renders title for create mode and triggers submit', async () => {
    const actions = renderDialog();

    expect(screen.getByRole('heading', { name: 'Atribuir cargo interno' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Atribuir cargo' }));
    expect(actions.onSubmit).toHaveBeenCalledOnce();
  });

  it('renders title for edit mode', () => {
    renderDialog({ data: { mode: 'edit', fields } });

    expect(screen.getByRole('heading', { name: 'Alterar cargo interno' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument();
  });

  // triste
  it('shows error state when provided', () => {
    renderDialog({
      state: { isOpen: true, error: 'Falha de comunicação com o servidor' },
    });

    expect(screen.getByText('Falha de comunicação com o servidor')).toBeInTheDocument();
  });
});
