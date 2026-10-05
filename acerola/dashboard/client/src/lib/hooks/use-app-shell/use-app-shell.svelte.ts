import { goto } from '$app/navigation';
import { page } from '$app/state';
import type { LucideIcon } from '@lucide/svelte';
import Cpu from '@lucide/svelte/icons/cpu';
import Server from '@lucide/svelte/icons/server';
import Wrench from '@lucide/svelte/icons/wrench';
import { createQuery, useQueryClient } from '@tanstack/svelte-query';
import { roleContextLabel } from '@template/shared/domain/role-context.util';
import {
  USER_ROLE_LABELS,
  type ContextRoles,
  type SessionUser,
} from '@template/shared/schemas/user.schema';
import { untrack } from 'svelte';
import { writable } from 'svelte/store';

import { ticketsApi } from '$lib/api/tickets.api';
import { neonAuth } from '$lib/auth/neon-auth.client';
import {
  type AreaContext,
  useAreaContextModel,
} from '$lib/hooks/use-area-context/use-area-context.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import {
  activeNavKeyOf,
  navItemsForContext,
  reconciledContextOf,
  type NavItem,
} from '$lib/navigation/navigation';

/**
 * O ícone de cada contexto. Um desenho por área faz a pessoa achar a dela pelo formato, antes
 * de ler — e é o que sobra de pista quando o rótulo fica cortado numa tela estreita.
 */
export const AREA_CONTEXT_ICONS: Record<AreaContext, LucideIcon> = {
  infra: Server,
  sistema: Cpu,
  manutencao: Wrench,
};

export type AppShellModel = {
  data: {
    badges: Partial<Record<string, number>>;
    user: {
      name: string;
      email: string;
      role: string;
      roles?: ContextRoles;
    };
    /**
     * Os contextos que esta pessoa atende — vazio quando ela não tem cargo em área nenhuma,
     * ou quando só tem uma (aí não há o que escolher, e o seletor nem aparece).
     */
    areaOptions: { value: AreaContext; label: string; icon: LucideIcon }[];
  };
  /** O menu DO CONTEXTO atual: cada área do sistema tem o seu (ver `navigation.ts`). */
  ui: { items: NavItem[] };
  state: {
    activeKey: string | undefined;
    routeKey: string;
    isProfileOpen: boolean;
    areaContext: AreaContext;
  };
  actions: {
    onLogout: () => void;
    onOpenProfile: () => void;
    onCloseProfile: () => void;
    onViewRoles: () => void;
    onAreaContextChange: (context: AreaContext) => void;
  };
};

/**
 * O que a casca precisa: quem está usando, qual item do menu está aceso, os contadores e como
 * sair.
 *
 * `user` chega por parâmetro — não é este hook que decide quem está logado, é a guarda de
 * `routes/(app)/+layout.ts`. Por isso ele só monta dentro do grupo `(app)`, depois que a
 * sessão já foi conferida.
 *
 * Contador de menu (ex.: "3 tarefas atrasadas") é buscado AQUI, uma vez, e não em cada rota:
 * o menu é o mesmo em todas, e buscar de novo a cada navegação repetiria a mesma consulta a
 * cada clique. Falha de contador NÃO derruba o menu — `useQuery` sem `throwOnError`, e o selo
 * simplesmente não aparece.
 */
export function useAppShellModel(input: { user: SessionUser }): AppShellModel {
  const queryClient = useQueryClient();
  let isProfileOpen = $state(false);

  /* As áreas que a pessoa atende (#13) — uma vez, igual ao resto do menu: buscar de novo a
     cada navegação repetiria a mesma consulta a cada clique. Falha NÃO derruba o menu —
     `useQuery` sem `throwOnError`, e o seletor simplesmente não aparece. */
  const areas = mirrorStore(
    createQuery(
      writable({ queryKey: ['tickets', 'areas', 'mine'], queryFn: () => ticketsApi.myAreas() }),
    ),
  );

  const areaContext = useAreaContextModel();

  /* O contexto se ajusta à TELA ABERTA e ao CARGO de quem entrou (a decisão inteira está em
     `reconciledContextOf`). O `untrack` é o que mantém isto honesto: o efeito reage à rota e
     às áreas da pessoa, mas NÃO ao contexto que ele mesmo escreve — sem ele, trocar de
     contexto estando numa tela de outro (clicar em "Manutenção" no Depósito) voltaria na
     hora para o anterior, e a pastilha pareceria travada. */
  $effect(() => {
    const pathname = page.url.pathname;
    const available = areas.current.data ?? [];

    const next = untrack(() =>
      reconciledContextOf({ pathname, current: areaContext.context, available }),
    );
    if (!next) return;

    areaContext.actions.onContextChange(next);
  });

  return {
    data: {
      badges: {},
      user: {
        name: input.user.name,
        email: input.user.email,
        role: USER_ROLE_LABELS[input.user.role],
        roles: input.user.roles,
      },
      get areaOptions() {
        const mine = areas.current.data ?? [];
        /* Com uma área só (ou nenhuma), não há o que escolher: um seletor de uma opção só
           ocuparia o cabeçalho sem nunca mudar nada. */
        if (mine.length <= 1) return [];

        return mine.map((area) => ({
          value: area,
          label: roleContextLabel(area),
          icon: AREA_CONTEXT_ICONS[area],
        }));
      },
    },
    /* O menu é o do contexto atual. `get`, pelo mesmo motivo do `state` abaixo: o model é
       montado uma vez, e o contexto muda depois — uma lista fixa congelaria o menu da
       primeira área em que a pessoa entrou. */
    get ui() {
      return { items: navItemsForContext(areaContext.context) };
    },
    /* Qual item está ativo é decidido AQUI, e não no componente: resolver a rota atual é
       trabalho de hook; o componente continua sem saber de roteamento.

       `get` e não valor: o model é montado uma vez, mas `page` muda a cada navegação. Com um
       valor fixo, o item aceso congelaria no primeiro que a pessoa abrisse. */
    get state() {
      return {
        activeKey: activeNavKeyOf(page.url.pathname),
        routeKey: page.url.pathname,
        isProfileOpen,
        areaContext: areaContext.context,
      };
    },
    actions: {
      onOpenProfile: () => {
        void goto('/profile');
      },
      onCloseProfile: () => {
        isProfileOpen = false;
      },
      onViewRoles: () => {
        void goto('/profile');
      },
      /* Trocar de contexto pode deixar a pessoa numa tela que não existe no contexto novo (o
         Depósito é só de Infraestrutura). Nesse caso o sistema leva para a primeira tela do
         contexto escolhido — o Painel —, porque ficar numa tela fora do menu é o jeito mais
         rápido de a pessoa achar que o sistema quebrou. */
      onAreaContextChange: (context: AreaContext) => {
        areaContext.actions.onContextChange(context);

        const activeKey = activeNavKeyOf(page.url.pathname);
        /* Tela que não é de contexto nenhum (o perfil, os cargos): a pessoa continua nela. */
        if (!activeKey) return;

        const items = navItemsForContext(context);
        if (items.some((item) => item.key === activeKey)) return;

        const first = items[0];
        if (first) void goto(first.to);
      },
      /* Quem encerra a sessão é o Neon Auth, e a tentativa é best-effort: mesmo se a rede
         estiver caída, a pessoa ainda sai daqui. O `queryClient.clear()` é a parte que não
         pode falhar — sem ele, os dados da pessoa anterior continuariam na tela do próximo
         que entrasse nesta mesma máquina. */
      onLogout: () => {
        void (async () => {
          try {
            await neonAuth.signOut();
          } catch {
            // segue para o `finally` mesmo assim — sair não pode depender de rede.
          } finally {
            queryClient.clear();
            void goto('/login');
          }
        })();
      },
    },
  };
}
