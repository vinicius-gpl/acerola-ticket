/**
 * O tema claro/escuro da tela — o MESMO mecanismo do agente (`acerola/agent/svelte/src/lib/theme`):
 * um atributo `data-theme` no `<html>`, guardado no `localStorage` para sobreviver ao fechar o
 * navegador.
 *
 * Mora fora de `lib/hooks/` de propósito: não é o estado de UMA tela, é uma preferência do
 * sistema inteiro — por isso o `$state` vive no escopo do MÓDULO (uma vez só, compartilhado por
 * quem importar), e não dentro de uma função que cada rota chamaria com a própria cópia.
 */

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'acerola-theme';

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Nada salvo ainda? Segue a preferência do sistema operacional, não um padrão fixo. */
function loadInitial(): Theme {
  if (typeof window === 'undefined') return 'light';

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;

  return systemPrefersDark() ? 'dark' : 'light';
}

function apply(theme: Theme): void {
  if (typeof document === 'undefined') return;

  document.documentElement.setAttribute('data-theme', theme);
}

let theme = $state<Theme>(loadInitial());
apply(theme);

export function useThemeModel() {
  return {
    get theme() {
      return theme;
    },
    actions: {
      onToggle: () => {
        theme = theme === 'dark' ? 'light' : 'dark';
        window.localStorage.setItem(STORAGE_KEY, theme);
        apply(theme);
      },
    },
  };
}
