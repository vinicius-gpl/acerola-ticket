import { page } from '$app/state';
import { USER_ROLE_LABELS } from '@template/shared/schemas/user.schema';

import { mockAuth } from '../auth/mock-user';
import { activeNavKeyOf } from '../ui/navigation';

export type AppShellModel = {
  data: {
    badges: Partial<Record<string, number>>;
    user: { name: string; email: string; role: string };
  };
  state: { activeKey: string | undefined };
};

/**
 * O que a casca precisa: quem está usando, qual item do menu está aceso e os contadores.
 *
 * Contador de menu (ex.: "3 tarefas atrasadas") é buscado AQUI, uma vez, e não em cada rota:
 * o menu é o mesmo em todas, e buscar de novo a cada navegação repetiria a mesma consulta a
 * cada clique. Falha de contador NÃO derruba o menu — `useQuery` sem `throwOnError`, e o selo
 * simplesmente não aparece.
 */
export function useAppShellModel(): AppShellModel {
  const user = mockAuth.getUser();

  return {
    data: {
      badges: {},
      user: {
        name: user.name,
        email: user.email,
        role: USER_ROLE_LABELS[user.role],
      },
    },
    /* Qual item está ativo é decidido AQUI, e não no componente: resolver a rota atual é
       trabalho de view-model; o compositor continua sem saber de roteamento.

       `get` e não valor: o model é montado uma vez, mas `page` muda a cada navegação. Com um
       valor fixo, o item aceso congelaria no primeiro que a pessoa abrisse. */
    get state() {
      return { activeKey: activeNavKeyOf(page.url.pathname) };
    },
  };
}
