/**
 * "Ver sempre em cards" — uma preferência do SISTEMA, não de uma tela: quem prefere cards liga
 * uma vez e toda tabela do painel (as que já tinham modo cards no celular) passa a abrir assim,
 * em qualquer largura. Mora fora de `lib/hooks/` pelo mesmo motivo do tema (`lib/theme`): o
 * `$state` vive no escopo do MÓDULO, compartilhado por quem importar, e não copiado por tela.
 *
 * Sem preferência salva, a tela decide pela própria largura (como já era: cards no celular,
 * tabela no desktop) — "automático" continua sendo o padrão de quem nunca tocou no botão.
 */

export type TableView = 'auto' | 'cards';

const STORAGE_KEY = 'acerola-table-view';

function loadInitial(): TableView {
  if (typeof window === 'undefined') return 'auto';

  return window.localStorage.getItem(STORAGE_KEY) === 'cards' ? 'cards' : 'auto';
}

let view = $state<TableView>(loadInitial());

export function useTableViewModel() {
  return {
    get view() {
      return view;
    },
    /** O que cada tela pergunta: "devo forçar cards, mesmo tendo espaço para a tabela?" */
    get forceCards() {
      return view === 'cards';
    },
    actions: {
      onToggle: () => {
        view = view === 'cards' ? 'auto' : 'cards';
        if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, view);
      },
    },
  };
}
