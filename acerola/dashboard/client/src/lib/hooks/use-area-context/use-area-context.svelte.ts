import {
  isRoleContext,
  ROLE_CONTEXTS,
  type RoleContext,
} from '@template/shared/domain/role-context.util';

/**
 * O CONTEXTO em que a pessoa está usando o sistema: Infraestrutura, Sistema ou Manutenção.
 *
 * São três sistemas dentro de um. O contexto não filtra só a fila de chamados — ele decide o
 * MENU (ver `navigation.ts`): Infra cuida do parque de máquinas, Sistema só de chamado, e
 * Manutenção de inventário geral, orçamento e chamado externo. Por isso não existe mais um
 * "Todas as áreas": uma tela que some de um contexto e aparece em outro não tem como estar em
 * todos ao mesmo tempo, e um menu com tudo junto seria o menu de ninguém.
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
