import { describe, expect, it } from 'vitest';
import {
  agentDownloadKindSchema,
  agentDownloadQuerySchema,
  agentReleaseManifestSchema,
} from './agent-release.schema';

function manifest() {
  const artifact = (file: string) => ({
    key: `agent/releases/1.2.3/${file}`,
    sha256: 'a'.repeat(64),
    sizeBytes: 123,
  });
  return {
    version: '1.2.3',
    publishedAt: '2026-10-15T12:00:00.000Z',
    artifacts: { msi: artifact('agent.msi'), certificate: artifact('publisher.cer') },
  };
}

describe('agent release manifest', () => {
  // feliz
  it('accepts versioned MSI and public certificate keys', () => {
    expect(agentReleaseManifestSchema.safeParse(manifest()).success).toBe(true);
  });
  // triste
  it.each([
    'tickets/file.msi',
    'agent/releases/1.2.3/../file.msi',
    'agent/releases/1.2.4/agent.msi',
    'agent/releases/1.2.3/private.pfx',
    'https://outside.example.test/agent.msi',
  ])('rejects unsafe key %s', (key) => {
    const data = manifest();
    data.artifacts.msi.key = key;
    expect(agentReleaseManifestSchema.safeParse(data).success).toBe(false);
  });
  it('rejects malformed integrity metadata', () => {
    const data = manifest();
    data.artifacts.msi.sha256 = 'not-a-hash';
    data.artifacts.msi.sizeBytes = -1;
    expect(agentReleaseManifestSchema.safeParse(data).success).toBe(false);
  });
});

describe('agent dashboard download contract', () => {
  // feliz
  it('accepts only the public installation artifacts and an exact version', () => {
    for (const kind of ['msi', 'certificate', 'certificateScript'])
      expect(agentDownloadKindSchema.safeParse(kind).success).toBe(true);
    expect(agentDownloadQuerySchema.safeParse({ version: '1.2.3' }).success).toBe(true);
  });
  // triste
  it('rejects private keys, object paths and incomplete versions', () => {
    for (const kind of ['pfx', 'tickets/private', '../publisher.cer'])
      expect(agentDownloadKindSchema.safeParse(kind).success).toBe(false);
    for (const version of [undefined, 'latest', '1.2', '01.2.3'])
      expect(agentDownloadQuerySchema.safeParse({ version }).success).toBe(false);
  });
});
