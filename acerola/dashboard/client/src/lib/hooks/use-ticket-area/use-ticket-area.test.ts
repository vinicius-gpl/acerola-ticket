import { TICKET_AREAS } from '@template/shared/domain/ticket-catalog.util';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'acerola-ticket-area-context';
const AREA = TICKET_AREAS[0];

/** O estado mora num `$state` de escopo de módulo — cada teste precisa de um módulo novo. */
async function freshTicketArea() {
  vi.resetModules();

  return import('./use-ticket-area.svelte');
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('useTicketAreaContextModel', () => {
  // feliz
  it('starts on every area when nothing was saved yet', async () => {
    const { useTicketAreaContextModel } = await freshTicketArea();

    expect(useTicketAreaContextModel().context).toBe('all');
  });

  it('shares the chosen context between callers and stores it', async () => {
    const { useTicketAreaContextModel } = await freshTicketArea();
    const model = useTicketAreaContextModel();

    model.actions.onContextChange(AREA);

    expect(useTicketAreaContextModel().context).toBe(AREA);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(AREA);
  });

  // triste
  it('ignores an invalid saved value and falls back to every area', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'area-que-nao-existe');
    const { useTicketAreaContextModel } = await freshTicketArea();

    expect(useTicketAreaContextModel().context).toBe('all');
  });
});
