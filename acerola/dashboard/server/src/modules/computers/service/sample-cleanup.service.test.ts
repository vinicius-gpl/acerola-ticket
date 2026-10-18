import { describe, expect, it, vi } from 'vitest';

import { type ComputersService } from './computers.service';
import { SampleCleanupService } from './sample-cleanup.service';

function makeJob(deleteOldSamples: ComputersService['deleteOldSamples']) {
  const computers = { deleteOldSamples } as unknown as ComputersService;
  return new SampleCleanupService(computers);
}

describe('SampleCleanupService', () => {
  // feliz
  it('deletes the old samples as of the run time', async () => {
    const deleteOldSamples = vi.fn().mockResolvedValue(120);
    const now = new Date('2026-10-18T06:00:00Z');

    await makeJob(deleteOldSamples).run(now);

    expect(deleteOldSamples).toHaveBeenCalledWith(now);
  });

  // triste
  /* Banco fora do ar na madrugada: registra e tenta de novo na noite seguinte, sem cair. */
  it('swallows a failed cleanup instead of throwing', async () => {
    const deleteOldSamples = vi.fn().mockRejectedValue(new Error('banco fora do ar'));

    await expect(makeJob(deleteOldSamples).run()).resolves.toBeUndefined();
  });
});
