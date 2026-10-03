import { isTicketArea, type TicketArea } from '@template/shared/domain/ticket-catalog.util';

/**
 * O CONTEXTO (#13) que a pessoa está vendo: "Todas" as áreas que ela atende, ou uma só.
 *
 * O MESMO mecanismo do tema (`lib/theme/theme.svelte.ts`): uma preferência do sistema
 * inteiro, não de uma tela — por isso o `$state` vive no escopo do MÓDULO, compartilhado por
 * quem importar, e persistido para sobreviver ao fechar o navegador.
 *
 * Mora fora de `lib/hooks/` pelo mesmo motivo do tema: não é o estado de UMA tela. O
 * seletor fica no app-shell (#13), mas quem lê o valor é a fila de chamados.
 */
export type TicketAreaContext = TicketArea | 'all';

const STORAGE_KEY = 'acerola-ticket-area-context';

function loadInitial(): TicketAreaContext {
  if (typeof window === 'undefined') return 'all';

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'all' || isTicketArea(saved)) return saved;

  return 'all';
}

let context = $state<TicketAreaContext>(loadInitial());

export function useTicketAreaContextModel() {
  return {
    get context() {
      return context;
    },
    actions: {
      onContextChange: (next: TicketAreaContext) => {
        context = next;
        if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, next);
      },
    },
  };
}
