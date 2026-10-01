import { type InternalRole } from '@template/shared/schemas/internal-role.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Harness from './use-role-form-harness.test.svelte';
import { type RoleFormModel } from './use-role-form.svelte';

vi.mock('$lib/api/roles.api', () => ({
  rolesApi: { assign: vi.fn() },
}));

const { rolesApi } = await import('$lib/api/roles.api');

const ROLE: InternalRole = {
  id: 1,
  userId: 'usr_1',
  userEmail: 'ana@empresa.com.br',
  context: 'manutencao',
  role: 'manager',
  createdAt: '2026-10-01T12:00:00.000Z',
  createdBy: 'admin@empresa.com.br',
  updatedAt: null,
  updatedBy: null,
};

function mountModel(role: InternalRole | null = null, onSaved = vi.fn()): RoleFormModel {
  let model!: RoleFormModel;
  render(Harness, {
    props: {
      role,
      onSaved,
      onReady: (ready: RoleFormModel) => (model = ready),
    },
  });

  return model;
}

describe('useRoleFormModel', () => {
  beforeEach(() => {
    vi.mocked(rolesApi.assign).mockReset().mockResolvedValue(ROLE);
  });

  // feliz
  it('starts in create mode with empty fields', () => {
    const model = mountModel(null);

    expect(model.data.mode).toBe('create');
    expect(model.data.fields.userId.value).toBe('');
    expect(model.data.fields.context.value).toBe('sistema');
    expect(model.data.fields.role.value).toBe('user');
  });

  it('starts in edit mode populated with role data', () => {
    const model = mountModel(ROLE);

    expect(model.data.mode).toBe('edit');
    expect(model.data.fields.userId.value).toBe('usr_1');
    expect(model.data.fields.userEmail.value).toBe('ana@empresa.com.br');
    expect(model.data.fields.context.value).toBe('manutencao');
    expect(model.data.fields.role.value).toBe('manager');
  });

  it('submits valid assignment data and calls onSaved', async () => {
    const onSaved = vi.fn();
    const model = mountModel(null, onSaved);

    model.actions.onChange('userId', 'usr_novo');
    model.actions.onChange('userEmail', 'novo@empresa.com.br');
    model.actions.onChange('context', 'infra');
    model.actions.onChange('role', 'user');

    model.actions.onSubmit();

    await waitFor(() => {
      expect(rolesApi.assign).toHaveBeenCalledWith({
        userId: 'usr_novo',
        userEmail: 'novo@empresa.com.br',
        context: 'infra',
        role: 'user',
      });
      expect(onSaved).toHaveBeenCalled();
    });
  });

  // triste
  it('shows error on empty userId submit', async () => {
    const model = mountModel(null);

    model.actions.onSubmit();

    await waitFor(() => {
      expect(model.data.fields.userId.error).toBeTruthy();
      expect(rolesApi.assign).not.toHaveBeenCalled();
    });
  });
});
