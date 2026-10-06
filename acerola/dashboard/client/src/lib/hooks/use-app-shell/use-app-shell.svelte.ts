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
  contextOfPath,
  contextSwitchPath,
  fallbackContextOf,
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
  /** O menu DO MÓDULO que montou esta casca — o mesmo que entrou por `items`. */
  ui: { items: readonly NavItem[] };
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
 * `context` e `items` TAMBÉM chegam por parâmetro, e é aí que está a independência dos três
 * módulos: quem monta a casca é o `+layout.svelte` de cada contexto, que passa o contexto
 * dele e só a lista de menu dele. Este hook não descobre contexto nenhum — nem pelo endereço,
 * nem pelo que está guardado no navegador —, e por isso não tem como montar o menu de um
 * módulo dentro de outro.
 *
 * Contador de menu (ex.: "3 tarefas atrasadas") é buscado AQUI, uma vez, e não em cada rota:
 * o menu é o mesmo em todas, e buscar de novo a cada navegação repetiria a mesma consulta a
 * cada clique. Falha de contador NÃO derruba o menu — `useQuery` sem `throwOnError`, e o selo
 * simplesmente não aparece.
 */
export function useAppShellModel(input: {
  user: SessionUser;
  /** O módulo dono desta casca. */
  context: AreaContext;
  /** O menu dele — `INFRA_NAV_ITEMS`, `SYSTEM_NAV_ITEMS` ou `MAINTENANCE_NAV_ITEMS`. */
  items: readonly NavItem[];
}): AppShellModel {
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

  /* O ÚLTIMO contexto em que a pessoa esteve, guardado no navegador. Ele só responde por duas
     coisas: onde o sistema abre (ver `routes/+page.ts`) e qual menu aparece nas telas que não
     são de contexto nenhum (o perfil, os cargos). Quem está numa tela de módulo não o
     consulta para nada — ali o contexto chegou por `input.context`, do próprio layout. */
  const lastContext = useAreaContextModel();

  /* O contexto se ajusta ao CARGO de quem entrou: quem só atende Manutenção e abre um link
     de `/infra` é levado para a mesma tela da área dela (ou para a primeira, se a tela não
     existir lá). O `untrack` é o que mantém isto honesto: o efeito reage à rota e às áreas da
     pessoa, mas NÃO ao que ele mesmo escreve. */
  $effect(() => {
    const pathname = page.url.pathname;
    const available = areas.current.data ?? [];

    untrack(() => {
      const next = fallbackContextOf(input.context, available) ?? input.context;

      if (next !== lastContext.context) lastContext.actions.onContextChange(next);
      if (next === input.context) return;

      /* Tela que não é de contexto nenhum (o perfil, os cargos): o cargo corrige a lembrança
         do último contexto, mas não tira a pessoa da tela em que ela está. */
      if (!contextOfPath(pathname)) return;

      const destination = contextSwitchPath(pathname, next);
      if (destination) void goto(destination, { replaceState: true });
    });
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
    /* O menu é o que o layout do módulo passou, e nada mais. Valor fixo, e não `get`: a casca
       de um contexto vive e morre com a pasta dele — trocar de contexto é trocar de endereço,
       e aí monta a casca do outro módulo, com a lista dele. */
    ui: { items: input.items },
    /* Qual item está ativo é decidido AQUI, e não no componente: resolver a rota atual é
       trabalho de hook; o componente continua sem saber de roteamento.

       `get` e não valor: o model é montado uma vez, mas `page` muda a cada navegação. Com um
       valor fixo, o item aceso congelaria no primeiro que a pessoa abrisse. */
    get state() {
      return {
        activeKey: activeNavKeyOf(page.url.pathname, input.items),
        routeKey: page.url.pathname,
        isProfileOpen,
        areaContext: input.context,
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
      /* Trocar de contexto é TROCAR DE ENDEREÇO, sempre: a pessoa vai para a mesma tela do
         contexto escolhido (Chamados existe nos três) ou, quando a tela não existe lá (o
         Depósito de máquinas), para a primeira dele — a decisão está em `contextSwitchPath`.
         Do perfil, que não é de módulo nenhum, ela entra na primeira tela do contexto: a
         casca de cada módulo é montada pela pasta dele, e não há como trocar só o menu
         ficando onde está. */
      onAreaContextChange: (context: AreaContext) => {
        lastContext.actions.onContextChange(context);

        const destination = contextSwitchPath(page.url.pathname, context);
        if (destination) void goto(destination);
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
