import {
  agentLtsSchema,
  agentFileLinkSchema,
  agentReleaseItemSchema,
  type AgentDownloadKind,
} from '@template/shared/schemas/agent-release.schema';
import { apiRequest } from './http-client';

export const agentDownloadApi = {
  lts: async () => {
    const result = await apiRequest<unknown>('/agent/downloads/lts');
    if (result === undefined) return null;
    return agentLtsSchema.parse(result);
  },
  download: async (kind: AgentDownloadKind, version: string) =>
    agentFileLinkSchema.parse(
      await apiRequest<unknown>(`/agent/downloads/lts/${kind}`, { query: { version } }),
    ),
  /** Todas as versões publicadas no R2, da mais nova para a mais antiga. */
  releases: async () =>
    agentReleaseItemSchema
      .array()
      .parse(await apiRequest<unknown>('/agent/downloads/releases')),
  /** O link temporário de um arquivo de qualquer versão publicada. */
  downloadVersion: async (kind: AgentDownloadKind, version: string) =>
    agentFileLinkSchema.parse(
      await apiRequest<unknown>(
        `/agent/downloads/releases/${encodeURIComponent(version)}/${kind}`,
      ),
    ),
};
