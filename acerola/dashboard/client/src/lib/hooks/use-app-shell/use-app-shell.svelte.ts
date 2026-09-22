import { goto } from '$app/navigation';
import { page } from '$app/state';
import { useQueryClient } from '@tanstack/svelte-query';
import { USER_ROLE_LABELS, type SessionUser } from '@template/shared/schemas/user.schema';

import { authApi } from '$lib/api/auth.api';
import { activeNavKeyOf } from '$lib/navigation/navigation';

export type AppShellModel = {
  data: {
    badges: Partial<Record<string, number>>;
    user: { name: string; email: string; role: string };
  };
  state: { activeKey: string | undefined };
  actions: { onLogout: () => void };
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

  return {
    data: {
      badges: {},
      user: {
        name: input.user.name,
        email: input.user.email,
        role: USER_ROLE_LABELS[input.user.role],
      },
    },
    /* Qual item está ativo é decidido AQUI, e não no componente: resolver a rota atual é
       trabalho de hook; o componente continua sem saber de roteamento.

       `get` e não valor: o model é montado uma vez, mas `page` muda a cada navegação. Com um
       valor fixo, o item aceso congelaria no primeiro que a pessoa abrisse. */
    get state() {
      return { activeKey: activeNavKeyOf(page.url.pathname) };
    },
    actions: {
      /* Best-effort: mesmo se `/auth/logout` falhar (rede caída), a pessoa ainda sai — o
         cookie que sobrar é inútil sozinho, e a guarda pede sessão de novo no próximo /me. */
      onLogout: () => {
        void (async () => {
          try {
            await authApi.logout();
          } catch {
            // segue para o `finally` mesmo assim — sair não pode depender da API responder.
          } finally {
            queryClient.clear();
            void goto('/login');
          }
        })();
      },
    },
  };
}
