import { type SessionUser } from '@template/shared/schemas/user.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Harness from './use-app-shell-harness.test.svelte';
import { type AppShellModel } from './use-app-shell.svelte';

vi.mock('$lib/api/auth.api', () => ({ authApi: { logout: vi.fn() } }));

const { authApi } = await import('$lib/api/auth.api');
const { goto } = await import('$app/navigation');

function user(overrides: Partial<SessionUser> = {}): SessionUser {
  return { id: '1', email: 'ana@empresa.com.br', name: 'Ana', role: 'admin', ...overrides };
}

function mountModel(overrides: Partial<SessionUser> = {}): AppShellModel {
  let model!: AppShellModel;
  render(Harness, { props: { user: user(overrides), onReady: (ready) => (model = ready) } });

  return model;
}

beforeEach(() => {
  vi.mocked(authApi.logout).mockReset().mockResolvedValue(undefined);
  vi.mocked(goto).mockClear();
});

describe('useAppShellModel', () => {
  // feliz
  it('translates the session user into what the shell shows', () => {
    const model = mountModel({ name: 'Ana Souza', email: 'ana@empresa.com.br', role: 'editor' });

    expect(model.data.user).toEqual({
      name: 'Ana Souza',
      email: 'ana@empresa.com.br',
      role: 'Edição',
    });
  });

  it('logs out and navigates to /login', async () => {
    const model = mountModel();

    model.actions.onLogout();

    await waitFor(() => expect(authApi.logout).toHaveBeenCalledOnce());
    await waitFor(() => expect(goto).toHaveBeenCalledWith('/login'));
  });

  // triste
  it('still navigates to /login even when the logout request fails', async () => {
    vi.mocked(authApi.logout).mockRejectedValueOnce(new Error('network down'));
    const model = mountModel();

    model.actions.onLogout();

    await waitFor(() => expect(goto).toHaveBeenCalledWith('/login'));
  });
});
