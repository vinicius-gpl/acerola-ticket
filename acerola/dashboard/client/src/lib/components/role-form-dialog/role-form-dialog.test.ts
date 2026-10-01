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

  it('allows selecting context and role via interactive cards', async () => {
    const actions = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: /Infraestrutura/i }));
    expect(actions.onChange).toHaveBeenCalledWith('context', 'infra');

    await userEvent.click(screen.getByRole('button', { name: /Administrador/i }));
    expect(actions.onChange).toHaveBeenCalledWith('role', 'admin');
  });

  it('disables context selection in edit mode', () => {
    renderDialog({ data: { mode: 'edit', fields } });

    const infraBtn = screen.getByRole('button', { name: /Infraestrutura/i });
    expect(infraBtn).toBeDisabled();
  });

  // triste
  it('shows error state when provided', () => {
    renderDialog({
      state: { isOpen: true, error: 'Falha de comunicação com o servidor' },
    });

    expect(screen.getByText('Falha de comunicação com o servidor')).toBeInTheDocument();
  });

  it('lists directory users and allows picking a user', async () => {
    const mockUsers = [
      {
        id: 'usr_carlos',
        name: 'Carlos Oliveira',
        email: 'carlos@empresa.com.br',
        role: 'manager',
      },
    ];

    const actions = renderDialog({
      data: { mode: 'create', users: mockUsers, fields },
    });

    expect(screen.getByText('Carlos Oliveira')).toBeInTheDocument();
    expect(screen.getByText('carlos@empresa.com.br')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('option', { name: /Carlos Oliveira/i }));
    expect(actions.onChange).toHaveBeenCalledWith('userId', 'usr_carlos');
    expect(actions.onChange).toHaveBeenCalledWith('userEmail', 'carlos@empresa.com.br');
  });

  it('renders selected user card and allows changing person', async () => {
    const selectedFields = {
      ...fields,
      userId: { value: 'usr_carlos', error: null },
      userEmail: { value: 'carlos@empresa.com.br', error: null },
    };

    const actions = renderDialog({
      data: {
        mode: 'create',
        fields: selectedFields,
        users: [{ id: 'usr_carlos', name: 'Carlos Oliveira', email: 'carlos@empresa.com.br' }],
      },
    });

    expect(screen.getByText('Carlos Oliveira')).toBeInTheDocument();
    expect(screen.getByText('Selecionada')).toBeInTheDocument();

    const changeBtn = screen.getByRole('button', { name: 'Trocar pessoa' });
    await userEvent.click(changeBtn);
    expect(actions.onChange).toHaveBeenCalledWith('userId', '');
    expect(actions.onChange).toHaveBeenCalledWith('userEmail', '');
  });
});
