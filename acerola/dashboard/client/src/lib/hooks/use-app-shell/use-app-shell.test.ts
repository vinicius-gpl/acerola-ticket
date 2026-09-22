import { type SessionUser } from '@template/shared/schemas/user.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Harness from './use-app-shell-harness.test.svelte';
import { type AppShellModel } from './use-app-shell.svelte';

vi.mock('$lib/auth/neon-auth.client', () => ({
  neonAuth: { signOut: vi.fn() },
  readAuthToken: vi.fn().mockResolvedValue(null),
}));

const { neonAuth } = await import('$lib/auth/neon-auth.client');
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
  vi.mocked(neonAuth.signOut).mockReset().mockResolvedValue(undefined as never);
  vi.mocked(goto).mockClear();
});

describe('useAppShellModel', () => {
  // feliz
  it('translates the session user into what the shell shows', () => {
    const model = mountModel({ name: 'Ana Souza', email: 'ana@empresa.com.br', role: 'manager' });

    expect(model.data.user).toEqual({
      name: 'Ana Souza',
      email: 'ana@empresa.com.br',
      role: 'Gerente',
    });
  });

  it('logs out at Neon Auth and navigates to /login', async () => {
    const model = mountModel();

    model.actions.onLogout();

    await waitFor(() => expect(neonAuth.signOut).toHaveBeenCalledOnce());
    await waitFor(() => expect(goto).toHaveBeenCalledWith('/login'));
  });

  // triste
  /* Sair não pode depender de rede: quem clicou em "Sair" precisa sair da tela de qualquer
     jeito, e a sessão que sobrar do lado da Neon vence sozinha. */
  it('still navigates to /login even when the sign out request fails', async () => {
    vi.mocked(neonAuth.signOut).mockRejectedValueOnce(new Error('network down'));
    const model = mountModel();

    model.actions.onLogout();

    await waitFor(() => expect(goto).toHaveBeenCalledWith('/login'));
  });
});
