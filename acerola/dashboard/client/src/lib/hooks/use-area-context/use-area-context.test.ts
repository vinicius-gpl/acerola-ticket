import { ROLE_CONTEXTS } from '@template/shared/domain/role-context.util';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'acerola-area-context';
const OTHER_CONTEXT = ROLE_CONTEXTS[2];

/** O estado mora num `$state` de escopo de módulo — cada teste precisa de um módulo novo. */
async function freshAreaContext() {
  vi.resetModules();

  return import('./use-area-context.svelte');
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('useAreaContextModel', () => {
  // feliz
  it('starts on infrastructure when nothing was saved yet', async () => {
    const { useAreaContextModel } = await freshAreaContext();

    expect(useAreaContextModel().context).toBe('infra');
  });

  it('shares the chosen context between callers and stores it', async () => {
    const { useAreaContextModel } = await freshAreaContext();
    const model = useAreaContextModel();

    model.actions.onContextChange(OTHER_CONTEXT);

    expect(useAreaContextModel().context).toBe(OTHER_CONTEXT);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(OTHER_CONTEXT);
  });

  it('reopens on the context saved in the last visit', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'manutencao');
    const { useAreaContextModel } = await freshAreaContext();

    expect(useAreaContextModel().context).toBe('manutencao');
  });

  // triste
  it('ignores an invalid saved value and falls back to infrastructure', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'area-que-nao-existe');
    const { useAreaContextModel } = await freshAreaContext();

    expect(useAreaContextModel().context).toBe('infra');
  });

  /* "Todas as áreas" deixou de existir: o valor antigo, guardado antes dos três contextos,
     não pode abrir o sistema num contexto que não existe mais. */
  it('ignores the "all areas" value saved by the previous version', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'all');
    const { useAreaContextModel } = await freshAreaContext();

    expect(useAreaContextModel().context).toBe('infra');
  });
});
