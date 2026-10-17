import { triggerUrlDownload } from '$lib/utils/download-file.util';
import { createQuery } from '@tanstack/svelte-query';
import {
  type AgentDownloadKind,
  type AgentLts,
  type AgentReleaseItem,
} from '@template/shared/schemas/agent-release.schema';
import { agentDownloadApi } from '$lib/api/agent-download.api';
import { readError } from '$lib/api/http-client';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';

/** Qual arquivo está sendo preparado: o tipo, e de qual versão. */
export type AgentDownloading = { version: string; kind: AgentDownloadKind };

export type AgentDownloadModel = {
  data: { release: AgentLts | null; releases: AgentReleaseItem[] };
  state: {
    isLoading: boolean;
    error: string | null;
    downloadError: string | null;
    downloading: AgentDownloadKind | null;
    isLoadingReleases: boolean;
    releasesError: string | null;
    downloadingVersion: AgentDownloading | null;
  };
  actions: {
    onRetry: () => void;
    onDownload: (kind: AgentDownloadKind) => void;
    onDownloadVersion: (version: string, kind: AgentDownloadKind) => void;
  };
};

/** Cada clique pede um link novo: uma aba aberta por horas não guarda URL vencida. */
export function useAgentDownloadModel(): AgentDownloadModel {
  const release = mirrorStore(
    createQuery({ queryKey: ['agent-lts'], queryFn: agentDownloadApi.lts, staleTime: 30_000 }),
  );
  /* A lista de TODAS as versões publicadas no R2 — a LTS é só uma delas. */
  const releases = mirrorStore(
    createQuery({
      queryKey: ['agent-releases'],
      queryFn: agentDownloadApi.releases,
      staleTime: 30_000,
    }),
  );
  let downloading = $state<AgentDownloadKind | null>(null);
  let downloadingVersion = $state<AgentDownloading | null>(null);
  let downloadError = $state<string | null>(null);

  /* Um download por vez, venha do cartão da LTS ou da lista. */
  const isBusy = () => downloading !== null || downloadingVersion !== null;

  async function fetchAndOpen(request: () => Promise<{ url: string }>): Promise<void> {
    downloadError = null;
    try {
      const file = await request();
      // Navegar para o link de attachment baixa direto do bucket, sem pôr o MSI na memória da API.
      triggerUrlDownload(file.url);
    } catch (error) {
      downloadError = readError(error);
    }
  }

  async function download(kind: AgentDownloadKind): Promise<void> {
    const version = release.current.data?.version;
    if (!version || isBusy()) return;
    downloading = kind;
    await fetchAndOpen(() => agentDownloadApi.download(kind, version));
    downloading = null;
  }

  async function downloadVersion(version: string, kind: AgentDownloadKind): Promise<void> {
    if (isBusy()) return;
    downloadingVersion = { version, kind };
    await fetchAndOpen(() => agentDownloadApi.downloadVersion(kind, version));
    downloadingVersion = null;
  }

  return {
    get data() {
      return { release: release.current.data ?? null, releases: releases.current.data ?? [] };
    },
    get state() {
      return {
        isLoading: release.current.isPending,
        error: readError(release.current.error),
        downloadError,
        downloading,
        isLoadingReleases: releases.current.isPending,
        releasesError: readError(releases.current.error),
        downloadingVersion,
      };
    },
    actions: {
      onRetry: () => {
        downloadError = null;
        void release.current.refetch();
        void releases.current.refetch();
      },
      onDownload: (kind) => void download(kind),
      onDownloadVersion: (version, kind) => void downloadVersion(version, kind),
    },
  };
}
