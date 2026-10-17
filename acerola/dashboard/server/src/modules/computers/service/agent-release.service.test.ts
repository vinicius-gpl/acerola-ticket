import {
  ForbiddenException,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { type FileStorage } from '../../../lib/storage/file-storage.type';
import { type AgentReleaseRepository } from '../repository/agent-release.repository';
import { type ComputersService } from './computers.service';
import { AgentReleaseService } from './agent-release.service';

function setup() {
  const authenticateAgent = vi.fn().mockResolvedValue({ ok: true, computer: { id: 1 } });
  const artifact = (file: string) => ({
    key: `agent/releases/1.2.3/${file}`,
    sha256: 'a'.repeat(64),
    sizeBytes: 123,
  });
  const latest = vi.fn().mockResolvedValue({
    version: '1.2.3',
    publishedAt: '2026-10-15T12:00:00.000Z',
    artifacts: { msi: artifact('agent.msi'), certificate: artifact('publisher.cer') },
  });
  const downloadUrl = vi.fn().mockResolvedValue('https://storage.example.test/signed');
  const service = new AgentReleaseService(
    { authenticateAgent } as unknown as ComputersService,
    { latest } as unknown as AgentReleaseRepository,
    { downloadUrl } as unknown as FileStorage,
  );
  return { service, authenticateAgent, latest, downloadUrl };
}

describe('agent update authorization', () => {
  // feliz
  it('authenticates the existing machine token before signing the MSI URL', async () => {
    const { service, authenticateAgent, downloadUrl } = setup();
    expect(await service.latest('Bearer fixture-token')).toEqual({
      version: '1.2.3',
      url: 'https://storage.example.test/signed',
      sha256: 'a'.repeat(64),
      sizeBytes: 123,
    });
    expect(authenticateAgent).toHaveBeenCalledWith('fixture-token');
    expect(downloadUrl).toHaveBeenCalledWith(
      'agent/releases/1.2.3/agent.msi',
      300,
      'acerola-agent-1.2.3-x64.msi',
    );
  });
  it('returns no release before first publication', async () => {
    const { service, latest } = setup();
    latest.mockResolvedValue(null);
    await expect(service.latest('Bearer fixture-token')).resolves.toBeNull();
  });
  // triste
  it.each([undefined, '', 'Basic fixture-token', 'Bearer ', `Bearer ${'x'.repeat(513)}`])(
    'refuses missing or malformed credentials',
    async (header) => {
      const { service, authenticateAgent, latest } = setup();
      await expect(service.latest(header)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(authenticateAgent).not.toHaveBeenCalled();
      expect(latest).not.toHaveBeenCalled();
    },
  );
  it.each(['invalid-token', 'blocked'])('refuses %s before touching storage', async (reason) => {
    const { service, authenticateAgent, latest } = setup();
    authenticateAgent.mockResolvedValue({ ok: false, reason });
    await expect(service.latest('Bearer fixture-token')).rejects.toBeInstanceOf(
      reason === 'blocked' ? ForbiddenException : UnauthorizedException,
    );
    expect(latest).not.toHaveBeenCalled();
  });
  it('never signs arbitrary keys from a corrupt manifest', async () => {
    const { service, latest, downloadUrl } = setup();
    latest.mockResolvedValue({
      version: '1.2.3',
      artifacts: { msi: { key: 'tickets/private-photo.png' } },
    });
    await expect(service.latest('Bearer fixture-token')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(downloadUrl).not.toHaveBeenCalled();
  });
});
