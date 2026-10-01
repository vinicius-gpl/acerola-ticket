import { type InternalRole } from '@template/shared/schemas/internal-role.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-roles-harness.test.svelte';
import { type RolesModel } from './use-roles.svelte';

vi.mock('$lib/api/roles.api', () => ({
  rolesApi: { list: vi.fn(), assign: vi.fn(), remove: vi.fn() },
}));

const { rolesApi } = await import('$lib/api/roles.api');

function roleItem(overrides: Partial<InternalRole> = {}): InternalRole {
  return {
    id: 1,
    userId: 'user_1',
    userEmail: 'user@empresa.com.br',
    context: 'infra',
    role: 'user',
    createdAt: '2026-10-01T12:00:00.000Z',
    createdBy: 'admin@empresa.com.br',
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

function mountModel(): RolesModel {
  let model!: RolesModel;
  render(Harness, { props: { onReady: (ready: RolesModel) => (model = ready) } });

  return model;
}

async function mountLoadedModel(): Promise<RolesModel> {
  const model = mountModel();
  await waitFor(() => expect(model.state.isLoading).toBe(false));

  return model;
}

describe('useRolesModel', () => {
  beforeEach(() => {
    vi.mocked(rolesApi.list)
      .mockReset()
      .mockResolvedValue([
        roleItem({ id: 1, context: 'infra', role: 'user' }),
        roleItem({ id: 2, context: 'sistema', role: 'admin' }),
        roleItem({ id: 3, context: 'manutencao', role: 'manager' }),
      ]);
    vi.mocked(rolesApi.remove).mockReset().mockResolvedValue(undefined);
  });

  // feliz
  it('loads the internal roles and groups them', async () => {
    const model = await mountLoadedModel();

    expect(model.data.roles).toHaveLength(3);
    expect(model.data.total).toBe(3);
    expect(model.state.isEmpty).toBe(false);
  });

  it('filters by context', async () => {
    const model = await mountLoadedModel();

    model.actions.onContextChange('sistema');

    await waitFor(() => {
      expect(model.data.roles).toHaveLength(1);
      expect(model.data.roles[0]!.context).toBe('sistema');
      expect(model.data.roles[0]!.role).toBe('admin');
    });
  });

  it('filters by search text', async () => {
    const model = await mountLoadedModel();

    model.actions.onSearchChange('user@empresa');

    await waitFor(() => {
      expect(model.data.roles).toHaveLength(3);
    });

    model.actions.onSearchChange('inexistente');

    await waitFor(() => {
      expect(model.data.roles).toHaveLength(0);
      expect(model.state.isFilteredOut).toBe(true);
    });
  });

  it('confirms and executes role deletion', async () => {
    const model = await mountLoadedModel();

    const target = model.data.roles[0]!;
    model.actions.onAskDelete(target);
    expect(model.data.pendingDelete).toBe(target);

    model.actions.onConfirmDelete();

    await waitFor(() => {
      expect(rolesApi.remove).toHaveBeenCalledWith(target.id);
    });
  });

  // triste
  it('exposes load error when API fails', async () => {
    vi.mocked(rolesApi.list).mockRejectedValue(new ApiError(403, 'Esta ação é de Administrador.'));

    const model = await mountLoadedModel();

    expect(model.state.error).toContain('Esta ação é de Administrador.');
  });
});
