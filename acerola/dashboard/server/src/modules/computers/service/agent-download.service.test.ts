import { ConflictException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type FileStorage } from '../../../lib/storage/file-storage.type';
import { type AgentReleaseRepository } from '../repository/agent-release.repository';
import { AgentDownloadService } from './agent-download.service';

function setup() {
  const artifact = (name: string) => ({
    key: `agent/releases/1.2.3/${name}`,
    sha256: 'a'.repeat(64),
    sizeBytes: 123,
  });
  const latest = vi.fn().mockResolvedValue({
    version: '1.2.3',
    publishedAt: '2026-10-16T12:00:00.000Z',
    artifacts: { msi: artifact('agent.msi'), certificate: artifact('publisher.cer') },
  });
  const downloadUrl = vi.fn().mockResolvedValue('https://storage.example.test/signed');
  const service = new AgentDownloadService(
    { latest } as unknown as AgentReleaseRepository,
    { downloadUrl } as unknown as FileStorage,
  );
  return { service, latest, downloadUrl };
}
const person = (roles: RequestUser['roles']): RequestUser => ({
  id: 'fixture',
  email: 'fixture@example.test',
  name: 'Pessoa',
  role: 'user',
  roles,
});

describe('dashboard agent download', () => {
  // feliz
  it.each(['infra', 'sistema'] as const)(
    'allows read-only %s access and exposes only LTS metadata',
    async (context) => {
      const { service } = setup();
      expect(await service.lts(person({ [context]: 'user' }))).toEqual({
        version: '1.2.3',
        publishedAt: '2026-10-16T12:00:00.000Z',
        sizeBytes: 123,
      });
    },
  );
  it.each([
    ['msi', 'agent.msi', 'acerola-agent-1.2.3-x64.msi'],
    ['certificate', 'publisher.cer', 'publisher.cer'],
    ['certificateScript', 'install-certificate.ps1', 'install-certificate.ps1'],
  ] as const)('signs only the selected %s on demand', async (kind, key, fileName) => {
    const { service, downloadUrl } = setup();
    expect(await service.download(person({ infra: 'user' }), kind, '1.2.3')).toEqual({
      version: '1.2.3',
      url: 'https://storage.example.test/signed',
    });
    expect(downloadUrl).toHaveBeenCalledExactlyOnceWith(
      `agent/releases/1.2.3/${key}`,
      300,
      fileName,
    );
  });
  it('returns no LTS before promotion', async () => {
    const { service, latest } = setup();
    latest.mockResolvedValue(null);
    expect(await service.lts(person({ infra: 'user' }))).toBeNull();
  });
  // triste
  it.each([{}, { manutencao: 'admin' } as const])(
    'rejects unrelated modules before accessing storage',
    async (roles) => {
      const { service, latest, downloadUrl } = setup();
      await expect(service.lts(person(roles))).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.download(person(roles), 'msi', '1.2.3')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(latest).not.toHaveBeenCalled();
      expect(downloadUrl).not.toHaveBeenCalled();
    },
  );
  it('refuses mixing downloads after an LTS change', async () => {
    const { service, downloadUrl } = setup();
    await expect(
      service.download(person({ infra: 'user' }), 'msi', '1.2.2'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(downloadUrl).not.toHaveBeenCalled();
  });
  it('refuses arbitrary object keys from malformed metadata', async () => {
    const { service, latest, downloadUrl } = setup();
    latest.mockResolvedValue({ version: '1.2.3', artifacts: { msi: { key: 'tickets/private' } } });
    await expect(
      service.download(person({ sistema: 'user' }), 'msi', '1.2.3'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(downloadUrl).not.toHaveBeenCalled();
  });
  it('reports storage failure instead of claiming no LTS exists', async () => {
    const { service, latest } = setup();
    latest.mockRejectedValue(new Error('private details'));
    await expect(service.lts(person({ infra: 'user' }))).rejects.toThrow(
      'Não consegui consultar o agente',
    );
  });
});

describe('dashboard agent release list', () => {
  const manifest = (version: string) => ({
    version,
    publishedAt: '2026-10-16T12:00:00.000Z',
    artifacts: {
      msi: { key: `agent/releases/${version}/agent.msi`, sha256: 'a'.repeat(64), sizeBytes: 100 },
      certificate: {
        key: `agent/releases/${version}/publisher.cer`,
        sha256: 'b'.repeat(64),
        sizeBytes: 10,
      },
    },
  });

  function listSetup(versions: string[], lts = '1.9.0') {
    const repository = {
      latest: vi.fn().mockResolvedValue(manifest(lts)),
      listVersions: vi.fn().mockResolvedValue(versions),
      manifestOf: vi.fn(async (version: string): Promise<unknown> =>
        version === 'quebrada' ? { version } : manifest(version),
      ),
    };
    const downloadUrl = vi.fn().mockResolvedValue('https://storage.example.test/signed');
    const service = new AgentDownloadService(
      repository as unknown as AgentReleaseRepository,
      { downloadUrl } as unknown as FileStorage,
    );

    return { service, repository, downloadUrl };
  }

  // feliz
  /* Ordem de versão, e não de texto: 1.10.0 é mais nova que 1.9.0. */
  it('lists every published version, newest first, with the LTS marked', async () => {
    const { service } = listSetup(['1.9.0', '1.10.0', '0.2.0']);

    const items = await service.releases(person({ sistema: 'user' }));

    expect(items.map((item) => [item.version, item.isLts])).toEqual([
      ['1.10.0', false],
      ['1.9.0', true],
      ['0.2.0', false],
    ]);
  });

  it('signs a file of an older version, not only of the LTS', async () => {
    const { service, downloadUrl } = listSetup(['1.9.0', '0.2.0']);

    await service.downloadVersion(person({ infra: 'user' }), 'msi', '0.2.0');

    expect(downloadUrl).toHaveBeenCalledWith(
      'agent/releases/0.2.0/agent.msi',
      300,
      'acerola-agent-0.2.0-x64.msi',
    );
  });

  // triste
  it('keeps out a version whose manifest does not match the contract', async () => {
    const { service } = listSetup(['1.9.0', 'quebrada']);

    const items = await service.releases(person({ infra: 'user' }));

    expect(items.map((item) => item.version)).toEqual(['1.9.0']);
  });

  it('refuses the list to who has neither Infraestrutura nor Sistema', async () => {
    const { service, repository } = listSetup(['1.9.0']);

    await expect(service.releases(person({ manutencao: 'admin' }))).rejects.toThrow(
      ForbiddenException,
    );
    expect(repository.listVersions).not.toHaveBeenCalled();
  });

  it('says not found for a version that was never published', async () => {
    const { service, repository } = listSetup([]);
    repository.manifestOf.mockResolvedValueOnce(null);

    await expect(service.downloadVersion(person({ infra: 'user' }), 'msi', '9.9.9')).rejects.toThrow(
      'não foi publicada',
    );
  });

  it('turns a storage outage into try again later', async () => {
    const { service, repository } = listSetup([]);
    repository.listVersions.mockRejectedValueOnce(new Error('AccessDenied'));

    await expect(service.releases(person({ infra: 'user' }))).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
