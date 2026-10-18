import { describe, expect, it, vi } from 'vitest';

import { type HistoryRepository } from '../repository/history.repository';
import { HistoryService } from './history.service';

const ENTRY = { action: 'tickets.update', changes: [] };

describe('HistoryService', () => {
  // feliz
  it('stores the entry', async () => {
    const insert = vi.fn().mockResolvedValue(undefined);

    await new HistoryService({ insert } as unknown as HistoryRepository).record(ENTRY);

    expect(insert).toHaveBeenCalledWith(ENTRY);
  });

  // triste
  /* A mudança já aconteceu: falhar o histórico não pode virar erro para quem mudou. */
  it('swallows a failure to store instead of failing the change', async () => {
    const insert = vi.fn().mockRejectedValue(new Error('db down'));

    await expect(
      new HistoryService({ insert } as unknown as HistoryRepository).record(ENTRY),
    ).resolves.toBeUndefined();
  });
});
