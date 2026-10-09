import { type SessionUser } from '@template/shared/schemas/user.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type AreaContext } from '$lib/hooks/use-area-context/use-area-context.svelte';
import {
  INFRA_NAV_ITEMS,
  MAINTENANCE_NAV_ITEMS,
  SYSTEM_NAV_ITEMS,
  type NavItem,
} from '$lib/navigation/navigation';
import Harness from './use-app-shell-harness.test.svelte';
import { type AppShellModel } from './use-app-shell.svelte';

vi.mock('$lib/auth/neon-auth.client', () => ({
  neonAuth: { signOut: vi.fn() },
  readAuthToken: vi.fn().mockResolvedValue(null),
}));

const { neonAuth } = await import('$lib/auth/neon-auth.client');
const { goto } = await import('$app/navigation');
const { page } = await import('$app/state');

/** A tela aberta, do ponto de vista do model: é dela que sai o item aceso. */
function openScreen(pathname: string) {
  page.url = new URL(`http://localhost:5173${pathname}`);
}

function user(overrides: Partial<SessionUser> = {}): SessionUser {
  return { id: '1', email: 'ana@empresa.com.br', name: 'Ana', role: 'admin', ...overrides };
}

/**
 * Monta a casca como o layout de um módulo monta: com o contexto e o menu DELE.
 * O padrão é a Infraestrutura, por ser o módulo com o sistema inteiro.
 */
function mountModel(
  overrides: Partial<SessionUser> = {},
  shell: { context: AreaContext; items: readonly NavItem[] } = {
    context: 'infra',
    items: INFRA_NAV_ITEMS,
  },
): AppShellModel {
  let model!: AppShellModel;
  render(Harness, {
    props: {
      user: user(overrides),
      context: shell.context,
      items: shell.items,
      onReady: (ready) => (model = ready),
    },
  });

  return model;
}

beforeEach(() => {
  vi.mocked(neonAuth.signOut)
    .mockReset()
    .mockResolvedValue(undefined as never);
  vi.mocked(goto).mockClear();
  openScreen('/');
});

describe('useAppShellModel contexts', () => {
  // feliz
  /* O menu é o do MÓDULO QUE MONTOU a casca, e nada mais: quem decide é a pasta do layout,
     não um filtro em tempo de execução. Infraestrutura cuida do parque de máquinas; Sistema
     é só chamado. */
  it('gives only the menu of the module that mounted it', () => {
    openScreen('/infra/computers');
    const infra = mountModel();
    expect(infra.ui.items.map((item) => item.key)).toContain('infra/computers');
    expect(infra.state.areaContext).toBe('infra');

    openScreen('/system/tickets');
    const system = mountModel({}, { context: 'sistema', items: SYSTEM_NAV_ITEMS });
    expect(system.ui.items.map((item) => item.key)).toEqual(
      SYSTEM_NAV_ITEMS.map((item) => item.key),
    );
    expect(system.state.areaContext).toBe('sistema');
    expect(system.state.activeKey).toBe('system/tickets');
  });

  /* A TRAVA: a casca de um módulo não acende item nenhum em endereço de outro — e o menu
     continua sendo só o dela. É o que impede o menu da Manutenção de aparecer em `/infra`. */
  it('lights nothing when the address belongs to another module', () => {
    openScreen('/infra/parts');
    const model = mountModel({}, { context: 'manutencao', items: MAINTENANCE_NAV_ITEMS });

    expect(model.state.activeKey).toBeUndefined();
    expect(model.ui.items.every((item) => item.context === 'manutencao')).toBe(true);
  });

  /* Chamados existe nos três contextos: trocar de contexto ali leva para os Chamados do
     contexto escolhido — outra rota, com a fila dele. */
  it('takes the person to the same screen of the chosen context', async () => {
    openScreen('/infra/tickets');
    const model = mountModel();

    model.actions.onAreaContextChange('manutencao');

    await waitFor(() => expect(goto).toHaveBeenCalledWith('/maintenance/tickets'));
  });

  // triste
  /* Trocar de contexto na Rede (que é só de Infraestrutura) não pode deixar a pessoa numa
     tela fora do menu: o sistema leva para a primeira tela do contexto novo — o Painel dele. */
  it('takes the person to the first screen when the open one does not exist there', async () => {
    openScreen('/infra/network');
    const model = mountModel();

    model.actions.onAreaContextChange('manutencao');

    await waitFor(() => expect(goto).toHaveBeenCalledWith('/maintenance/dashboard'));
  });

  /* O perfil não é de módulo nenhum, e não existe "trocar só o menu": a casca de cada módulo
     é a pasta dele. Escolher um contexto ali é entrar nele, pela primeira tela (o Painel do módulo). */
  it('takes the person into the chosen context from a screen without a module', async () => {
    openScreen('/profile');
    const model = mountModel();

    model.actions.onAreaContextChange('sistema');

    await waitFor(() => expect(goto).toHaveBeenCalledWith('/system/dashboard'));
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
