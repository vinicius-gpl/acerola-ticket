import { describe, expect, it, vi } from 'vitest';

import { GITHUB_DAILY_SYNC_LOOKBACK_MS, GithubDailySyncService } from './github-daily-sync.service';
import { type SoftwareProjectsService } from './software-projects.service';

function makeJob(syncAllGithubSince: SoftwareProjectsService['syncAllGithubSince']) {
  const projects = { syncAllGithubSince } as unknown as SoftwareProjectsService;
  return new GithubDailySyncService(projects);
}

describe('GithubDailySyncService', () => {
  // feliz
  it('syncs every project looking back 48 hours from the run', async () => {
    const syncAllGithubSince = vi.fn().mockResolvedValue({ message: 'ok' });
    const now = new Date('2026-10-18T03:00:00Z');

    await makeJob(syncAllGithubSince).run(now);

    expect(syncAllGithubSince).toHaveBeenCalledWith(
      new Date(now.getTime() - GITHUB_DAILY_SYNC_LOOKBACK_MS),
    );
  });

  // triste
  /* Uma noite ruim no GitHub não pode derrubar o servidor nem cancelar a rodada seguinte. */
  it('swallows a failed run instead of throwing', async () => {
    const syncAllGithubSince = vi.fn().mockRejectedValue(new Error('GitHub fora do ar'));

    await expect(makeJob(syncAllGithubSince).run()).resolves.toBeUndefined();
  });
});
