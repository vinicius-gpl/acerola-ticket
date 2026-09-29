import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'acerola-theme';

/** O tema mora num `$state` de escopo de módulo — cada teste precisa de um módulo novo, senão
 * herda o valor deixado pelo teste anterior. */
async function freshTheme() {
  vi.resetModules();

  return import('./theme.svelte');
}

function mockSystemPrefersDark(prefersDark: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches: prefersDark }) as unknown as typeof window.matchMedia,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  mockSystemPrefersDark(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useThemeModel', () => {
  // feliz
  it('segue o sistema operacional quando nada foi salvo ainda', async () => {
    mockSystemPrefersDark(true);
    const { useThemeModel } = await freshTheme();

    expect(useThemeModel().theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('alterna entre claro e escuro e guarda a escolha', async () => {
    const { useThemeModel } = await freshTheme();
    const theme = useThemeModel();

    theme.actions.onToggle();
    expect(theme.theme).toBe('dark');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    theme.actions.onToggle();
    expect(theme.theme).toBe('light');
  });

  it('a escolha salva vale mais que a preferência do sistema', async () => {
    mockSystemPrefersDark(true);
    window.localStorage.setItem(STORAGE_KEY, 'light');
    const { useThemeModel } = await freshTheme();

    expect(useThemeModel().theme).toBe('light');
  });

  // triste
  it('ignora um valor inválido salvo e cai na preferência do sistema', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'catppuccin-mocha');
    mockSystemPrefersDark(true);
    const { useThemeModel } = await freshTheme();

    expect(useThemeModel().theme).toBe('dark');
  });
});
