import { afterEach, describe, expect, it, vi } from 'vitest';

type ChangeListener = (event: { matches: boolean }) => void;

/** Um `matchMedia` de mentira: guarda a consulta feita e deixa o teste disparar a mudança. */
function stubMatchMedia(matches: boolean) {
  const listeners: ChangeListener[] = [];
  const matchMedia = vi.fn((query: string) => ({
    matches,
    media: query,
    addEventListener: (_type: string, listener: ChangeListener) => listeners.push(listener),
  }));
  vi.stubGlobal('matchMedia', matchMedia);

  return { matchMedia, emit: (next: boolean) => listeners.forEach((fn) => fn({ matches: next })) };
}

/** As instâncias ficam num objeto de escopo de módulo — cada teste precisa de um módulo novo. */
async function freshMediaQuery() {
  vi.resetModules();

  return import('./use-media-query.svelte');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useMediaQuery', () => {
  // feliz
  it('asks the browser for the width just below the given breakpoint', async () => {
    const { matchMedia } = stubMatchMedia(true);
    const { useMediaQuery } = await freshMediaQuery();

    expect(useMediaQuery(1280).current).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith('(max-width: 1279px)');
  });

  it('follows the window when it crosses the breakpoint', async () => {
    const { emit } = stubMatchMedia(false);
    const { useMediaQuery } = await freshMediaQuery();
    const query = useMediaQuery(1280);

    emit(true);

    expect(query.current).toBe(true);
  });

  it('shares one instance per breakpoint and keeps breakpoints apart', async () => {
    const { matchMedia } = stubMatchMedia(false);
    const { useMediaQuery } = await freshMediaQuery();

    expect(useMediaQuery(1280)).toBe(useMediaQuery(1280));
    expect(useMediaQuery(1024)).not.toBe(useMediaQuery(1280));
    expect(matchMedia).toHaveBeenCalledTimes(2);
  });

  // triste
  it('stays false when the environment has no matchMedia', async () => {
    vi.stubGlobal('matchMedia', undefined);
    const { useMediaQuery } = await freshMediaQuery();

    expect(useMediaQuery(1280).current).toBe(false);
  });
});
