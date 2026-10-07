import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'acerola-effects';

/** O estado mora em `$state` de escopo de módulo — cada teste precisa de um módulo novo. */
async function freshEffects() {
  vi.resetModules();

  return import('./use-effects.svelte');
}

function stubCores(cores: number) {
  vi.stubGlobal('navigator', { hardwareConcurrency: cores });
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-effects');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useEffectsModel', () => {
  // feliz
  it('starts with full effects on a capable machine and tells the page', async () => {
    stubCores(8);
    const { useEffectsModel } = await freshEffects();

    expect(useEffectsModel().level).toBe('full');
    expect(useEffectsModel().isAutomatic).toBe(true);
    expect(document.documentElement.getAttribute('data-effects')).toBe('full');
  });

  it('starts light on a modest machine', async () => {
    stubCores(2);
    const { useEffectsModel } = await freshEffects();

    expect(useEffectsModel().level).toBe('lite');
    expect(document.documentElement.getAttribute('data-effects')).toBe('lite');
  });

  it('lets the person switch, saves the choice and stops deciding alone', async () => {
    stubCores(8);
    const { useEffectsModel } = await freshEffects();
    const effects = useEffectsModel();

    effects.actions.onToggle();

    expect(effects.level).toBe('lite');
    expect(effects.isAutomatic).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('lite');
    expect(document.documentElement.getAttribute('data-effects')).toBe('lite');
  });

  it('honors the saved choice even on a modest machine', async () => {
    stubCores(2);
    window.localStorage.setItem(STORAGE_KEY, 'full');
    const { useEffectsModel } = await freshEffects();

    expect(useEffectsModel().level).toBe('full');
  });

  it('drops to light after two slow measurements in a row', async () => {
    stubCores(8);
    const { useEffectsModel } = await freshEffects();
    const effects = useEffectsModel();

    effects.actions.onFrameRateMeasured(18);
    expect(effects.level).toBe('full');

    effects.actions.onFrameRateMeasured(22);
    expect(effects.level).toBe('lite');
    expect(document.documentElement.getAttribute('data-effects')).toBe('lite');
  });

  // triste
  it('ignores one slow measurement followed by a good one', async () => {
    stubCores(8);
    const { useEffectsModel } = await freshEffects();
    const effects = useEffectsModel();

    effects.actions.onFrameRateMeasured(18);
    effects.actions.onFrameRateMeasured(60);
    effects.actions.onFrameRateMeasured(18);

    expect(effects.level).toBe('full');
  });

  it('never overrides what the person chose, however slow the machine measures', async () => {
    stubCores(8);
    window.localStorage.setItem(STORAGE_KEY, 'full');
    const { useEffectsModel } = await freshEffects();
    const effects = useEffectsModel();

    effects.actions.onFrameRateMeasured(10);
    effects.actions.onFrameRateMeasured(10);

    expect(effects.level).toBe('full');
  });

  it('ignores an invalid saved value and decides alone', async () => {
    stubCores(8);
    window.localStorage.setItem(STORAGE_KEY, 'turbo');
    const { useEffectsModel } = await freshEffects();

    expect(useEffectsModel().level).toBe('full');
    expect(useEffectsModel().isAutomatic).toBe(true);
  });
});
