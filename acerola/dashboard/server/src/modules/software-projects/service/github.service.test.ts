import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type Database } from '../../../lib/db/db.type';
import { GithubService } from './github.service';

describe('GithubService', () => {
  const originalEnv = process.env.GITHUB_TOKEN;
  let mockDb: unknown;

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue([]),
    };
  });

  afterEach(() => {
    process.env.GITHUB_TOKEN = originalEnv;
    vi.restoreAllMocks();
  });

  it('fetchPullRequests returns parsed PR list on successful response', async () => {
    const service = new GithubService(mockDb as Database);

    const mockPrs = [
      {
        number: 42,
        title: 'feat: Test PR',
        html_url: 'https://github.com/owner/repo/pull/42',
        user: { login: 'dev' },
        state: 'open',
        merged_at: null,
        created_at: '2026-10-01T12:00:00Z',
      },
    ];

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce(mockPrs),
    } as unknown as Response);

    const result = await service.fetchPullRequests('owner', 'repo');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      externalId: '#42',
      title: 'feat: Test PR',
      author: 'dev',
      status: 'open',
    });
  });

  it('fetchPullRequests returns empty array on HTTP error without throwing', async () => {
    const service = new GithubService(mockDb as Database);

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as unknown as Response);

    const result = await service.fetchPullRequests('owner', 'invalid-repo');
    expect(result).toEqual([]);
  });

  it('fetchPullRequests returns empty array on network exception without throwing', async () => {
    const service = new GithubService(mockDb as Database);

    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    const result = await service.fetchPullRequests('owner', 'repo');
    expect(result).toEqual([]);
  });

  it('createIssue returns null when GITHUB_TOKEN is not configured', async () => {
    delete process.env.GITHUB_TOKEN;
    const service = new GithubService(mockDb as Database);

    const result = await service.createIssue('owner', 'repo', 'Title', 'Body');
    expect(result).toBeNull();
  });

  it('createIssue makes POST request and returns issue info when token is set', async () => {
    process.env.GITHUB_TOKEN = 'test-token';
    const service = new GithubService(mockDb as Database);

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ number: 99, html_url: 'https://github.com/owner/repo/issues/99' }),
    } as unknown as Response);

    const result = await service.createIssue('owner', 'repo', 'Bug', 'Body content');

    expect(result).toEqual({
      issueNumber: 99,
      issueUrl: 'https://github.com/owner/repo/issues/99',
    });
  });

  it('syncTicketToIssueInBackground executes asynchronously without throwing', () => {
    const service = new GithubService(mockDb as Database);

    expect(() => {
      service.syncTicketToIssueInBackground(
        10,
        1,
        'CH-0010',
        'Erro ao emitir relatório',
        'Descrição do chamado',
        'Solicitante',
      );
    }).not.toThrow();
  });
});
