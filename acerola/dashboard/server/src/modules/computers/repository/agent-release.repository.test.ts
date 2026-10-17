import { type S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { describe, expect, it, vi } from 'vitest';
import { type Env } from '../../../lib/config/env.schema';
import { AgentReleaseRepository } from './agent-release.repository';

describe('agent release storage', () => {
  // feliz
  it('reads only the fixed manifest key from the project bucket', async () => {
    const send = vi.fn().mockResolvedValue({
      ContentLength: 2,
      Body: { transformToString: () => Promise.resolve('{}') },
    });
    const repository = new AgentReleaseRepository(
      { send } as unknown as S3Client,
      { R2_BUCKET: 'fixture-bucket' } as Env,
    );
    await expect(repository.latest()).resolves.toEqual({});
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(GetObjectCommand);
    expect(send.mock.calls[0]?.[0].input).toEqual({
      Bucket: 'fixture-bucket',
      Key: 'agent/lts.json',
    });
  });
  it('treats only a missing manifest as no release', async () => {
    const send = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('missing'), { name: 'NoSuchKey' }));
    const repository = new AgentReleaseRepository(
      { send } as unknown as S3Client,
      { R2_BUCKET: 'fixture' } as Env,
    );
    await expect(repository.latest()).resolves.toBeNull();
    send.mockRejectedValue(new Error('AccessDenied'));
    await expect(repository.latest()).rejects.toThrow('AccessDenied');
  });
  // triste
  it('rejects oversized or invalid JSON', async () => {
    const send = vi.fn().mockResolvedValue({
      ContentLength: 20_000,
      Body: { transformToString: () => Promise.resolve('{}') },
    });
    const repository = new AgentReleaseRepository(
      { send } as unknown as S3Client,
      { R2_BUCKET: 'fixture' } as Env,
    );
    await expect(repository.latest()).rejects.toThrow('too large');
    send.mockResolvedValue({ Body: { transformToString: () => Promise.resolve('broken') } });
    await expect(repository.latest()).rejects.toThrow();
  });

  // feliz
  it('reads the manifest of one published version', async () => {
    const send = vi.fn().mockResolvedValue({
      ContentLength: 2,
      Body: { transformToString: () => Promise.resolve('{}') },
    });
    const repository = new AgentReleaseRepository(
      { send } as unknown as S3Client,
      { R2_BUCKET: 'fixture' } as Env,
    );

    await repository.manifestOf('1.2.3');

    expect(send.mock.calls[0]?.[0].input).toEqual({
      Bucket: 'fixture',
      Key: 'agent/releases/1.2.3/latest.json',
    });
  });

  /* Só pasta com cara de versão entra: lixo no prefixo não vira instalador na tela. */
  it('lists the version folders of the bucket, and nothing else', async () => {
    const send = vi.fn().mockResolvedValue({
      CommonPrefixes: [
        { Prefix: 'agent/releases/1.2.3/' },
        { Prefix: 'agent/releases/0.9.0/' },
        { Prefix: 'agent/releases/rascunho/' },
      ],
    });
    const repository = new AgentReleaseRepository(
      { send } as unknown as S3Client,
      { R2_BUCKET: 'fixture' } as Env,
    );

    await expect(repository.listVersions()).resolves.toEqual(['1.2.3', '0.9.0']);
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(ListObjectsV2Command);
    expect(send.mock.calls[0]?.[0].input).toMatchObject({
      Bucket: 'fixture',
      Prefix: 'agent/releases/',
      Delimiter: '/',
    });
  });
});
