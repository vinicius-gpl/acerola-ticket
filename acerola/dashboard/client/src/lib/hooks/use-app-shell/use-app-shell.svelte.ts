import { goto } from '$app/navigation';
import { page } from '$app/state';
import { createQuery, useQueryClient } from '@tanstack/svelte-query';
import { ticketAreaOptions } from '@template/shared/domain/ticket-catalog.util';
import {
  USER_ROLE_LABELS,
  type ContextRoles,
  type SessionUser,
} from '@template/shared/schemas/user.schema';
import { writable } from 'svelte/store';

import { ticketsApi } from '$lib/api/tickets.api';
import { neonAuth } from '$lib/auth/neon-auth.client';
import {
  type TicketAreaContext,
  useTicketAreaContextModel,
} from '$lib/hooks/use-ticket-area/use-ticket-area.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { activeNavKeyOf } from '$lib/navigation/navigation';

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
     * As áreas (#13) que esta pessoa atende, com a opção "Todas" na frente — vazio quando
     * ela não tem cargo em área nenhuma, ou quando só tem uma (aí não há o que escolher).
     */
    areaOptions: { value: TicketAreaContext; label: string }[];
  };
  state: {
    activeKey: string | undefined;
    routeKey: string;
    isProfileOpen: boolean;
    areaContext: TicketAreaContext;
  };
  actions: {
    onLogout: () => void;
    onOpenProfile: () => void;
    onCloseProfile: () => void;
    onViewRoles: () => void;
    onAreaContextChange: (context: TicketAreaContext) => void;
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

  const ticketAreaContext = useTicketAreaContextModel();

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
        /* Com uma área só (ou nenhuma), não há o que escolher — "Todas" e "Infra" seriam a
           mesma coisa na tela, e um seletor sem escolha real só confunde. */
        if (mine.length <= 1) return [];

        const allOptions = ticketAreaOptions();

        return [
          /* "Todas", e não "Todas as áreas": é uma pastilha ao lado das outras, e o rótulo
             "Contexto" na frente já diz do que se trata. */
          { value: 'all' as const, label: 'Todas' },
          ...mine.map((area) => ({
            value: area,
            label: allOptions.find((option) => option.value === area)?.label ?? area,
          })),
        ];
      },
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
        areaContext: ticketAreaContext.context,
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
      onAreaContextChange: ticketAreaContext.actions.onContextChange,
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
