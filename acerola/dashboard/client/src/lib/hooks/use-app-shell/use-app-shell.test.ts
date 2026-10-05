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
const { page } = await import('$app/state');

/** A tela aberta, do ponto de vista do model: é dela que sai o item aceso e o contexto. */
function openScreen(pathname: string) {
  page.url = new URL(`http://localhost:5173${pathname}`);
}

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
  openScreen('/');
});

describe('useAppShellModel contexts', () => {
  // feliz
  /* O menu NÃO é o mesmo nos três contextos: Infraestrutura cuida do parque de máquinas,
     Sistema é só chamado. */
  it('gives the menu of the context the person is in', () => {
    const model = mountModel();

    model.actions.onAreaContextChange('infra');
    expect(model.ui.items.map((item) => item.key)).toContain('computers');

    model.actions.onAreaContextChange('sistema');
    expect(model.ui.items.map((item) => item.key)).toEqual(['tickets']);
  });

  /* Trocar de contexto no Depósito (que é só de Infraestrutura) não pode deixar a pessoa
     numa tela fora do menu: o sistema leva para a primeira tela do contexto novo. */
  it('takes the person to the new context when the open screen does not exist there', async () => {
    openScreen('/parts');
    const model = mountModel();

    model.actions.onAreaContextChange('manutencao');

    await waitFor(() => expect(goto).toHaveBeenCalledWith('/tickets'));
  });

  // triste
  /* Chamados existe nos três contextos: trocar de contexto ali não tira a pessoa da tela. */
  it('keeps the person on a screen that exists in the new context', () => {
    openScreen('/tickets');
    const model = mountModel();

    model.actions.onAreaContextChange('manutencao');

    expect(goto).not.toHaveBeenCalled();
    expect(model.state.activeKey).toBe('tickets');
  });

  /* O perfil não é de contexto nenhum — trocar de contexto ali também não navega. */
  it('keeps the person on a screen that is in no menu', () => {
    openScreen('/profile');
    const model = mountModel();

    model.actions.onAreaContextChange('sistema');

    expect(goto).not.toHaveBeenCalled();
  });

  /* Sem cargo em área nenhuma, o seletor não aparece — não há o que escolher. */
  it('offers no context to choose while the areas of the person are unknown', () => {
    const model = mountModel();

    expect(model.data.areaOptions).toEqual([]);
  });
});

describe('useAppShellModel', () => {
  // feliz
  it('translates the session user into what the shell shows', () => {
    const model = mountModel({
      name: 'Ana Souza',
      email: 'ana@empresa.com.br',
      role: 'manager',
      roles: { sistema: 'admin', infra: 'user', manutencao: 'manager' },
    });

    expect(model.data.user).toEqual({
      name: 'Ana Souza',
      email: 'ana@empresa.com.br',
      role: 'Gestor',
      roles: { sistema: 'admin', infra: 'user', manutencao: 'manager' },
    });
  });

  it('navigates to /profile on onOpenProfile', async () => {
    const model = mountModel();

    model.actions.onOpenProfile();
    await waitFor(() => expect(goto).toHaveBeenCalledWith('/profile'));
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
