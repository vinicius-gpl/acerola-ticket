import {
  isRoleContext,
  ROLE_CONTEXTS,
  type RoleContext,
} from '@template/shared/domain/role-context.util';

/**
 * O ÚLTIMO CONTEXTO em que a pessoa usou o sistema: Infraestrutura, Sistema ou Manutenção.
 *
 * São três sistemas dentro de um, e quem diz em qual a pessoa ESTÁ é o endereço
 * (`/infra/...`, `/system/...`, `/maintenance/...` — ver `navigation.ts`). O que mora aqui é
 * só a lembrança do último: é por ela que o sistema sabe onde abrir (`routes/+page.ts`) e
 * qual menu mostrar nas telas que não são de contexto nenhum, como o perfil. Nenhuma tela
 * decide o que busca a partir daqui — a fila de chamados recebe a área da própria rota.
 *
 * O MESMO mecanismo do tema (`lib/theme/theme.svelte.ts`): uma preferência do sistema
 * inteiro, não de uma tela — por isso o `$state` vive no escopo do MÓDULO, compartilhado por
 * quem importar, e persistido para sobreviver ao fechar o navegador.
 */
export type AreaContext = RoleContext;

const STORAGE_KEY = 'acerola-area-context';

/**
 * Onde o sistema abre na primeira vez. Infraestrutura, porque é o contexto com o sistema
 * inteiro construído — e quem só atende outra área cai nela logo depois, pelo ajuste que o
 * app-shell faz com as áreas da pessoa (ver `use-app-shell`).
 */
const DEFAULT_CONTEXT: AreaContext = ROLE_CONTEXTS[0];

function loadInitial(): AreaContext {
  if (typeof window === 'undefined') return DEFAULT_CONTEXT;

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (isRoleContext(saved)) return saved;

  return DEFAULT_CONTEXT;
}

let context = $state<AreaContext>(loadInitial());

export function useAreaContextModel() {
  return {
    get context() {
      return context;
    },
    actions: {
      onContextChange: (next: AreaContext) => {
        context = next;
        if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, next);
      },
    },
  };
}
