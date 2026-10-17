<script lang="ts" module>
  import type { AgentDownloadModel } from '$lib/hooks/use-agent-download/use-agent-download.svelte';
  /** A mesma tela nos dois módulos: só apresenta dados e devolve as intenções de download. */
  export type AcerolaAgentDownloadViewProps = AgentDownloadModel;
</script>

<script lang="ts">
  import Download from '@lucide/svelte/icons/download';
  import Monitor from '@lucide/svelte/icons/monitor';
  import PageHeader from '$lib/components/acerola-page-header/acerola-page-header.svelte';
  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import EmptyState from '$lib/components/acerola-empty-state/acerola-empty-state.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import StatusBadge from '$lib/components/acerola-status-badge/acerola-status-badge.svelte';
  import { formatDateTime } from '$lib/utils/format-date';
  import { type AgentDownloadKind } from '@template/shared/schemas/agent-release.schema';

  let { data, state, actions }: AcerolaAgentDownloadViewProps = $props();

  const VERSION_FILES: { kind: AgentDownloadKind; label: string }[] = [
    { kind: 'msi', label: 'MSI' },
    { kind: 'certificate', label: 'Certificado' },
    { kind: 'certificateScript', label: 'Script' },
  ];

  function megabytes(sizeBytes: number): string {
    return (sizeBytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  }

  function isPreparing(version: string, kind: AgentDownloadKind): boolean {
    return state.downloadingVersion?.version === version && state.downloadingVersion.kind === kind;
  }

  const isAnyDownloading = $derived(state.downloading !== null || state.downloadingVersion !== null);
</script>

<div class="mx-auto flex w-full max-w-4xl flex-col gap-6">
  <PageHeader
    data={{
      title: 'Agente Windows',
      description: 'Instale o agente Acerola nos computadores da empresa.',
    }}
  />

  {#if state.isLoading}
    <p role="status" class="text-muted-foreground text-sm">Consultando a versão disponível…</p>
  {:else if state.error}
    <ErrorState
      data={{ title: 'Não consegui consultar o agente', message: state.error }}
      actions={{ onRetry: actions.onRetry }}
    />
  {:else if !data.release}
    <EmptyState
      data={{
        title: 'Nenhuma versão LTS disponível',
        description:
          'Uma versão precisa ser publicada e liberada como LTS antes do download. Consulte a equipe de Infraestrutura.',
      }}
      ui={{ icon: Monitor }}
    />
  {:else}
    <section
      class="rounded-surface border border-border bg-card p-6 shadow-xs"
      aria-label="Versão do agente"
    >
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="text-muted-foreground text-sm">Versão LTS</p>
          <h2 class="text-foreground mt-1 text-2xl font-bold break-words">
            Acerola Agent {data.release.version}
          </h2>
          <p class="text-muted-foreground mt-2 text-sm">
            Windows 10 (1809 ou superior) e Windows 11 · 64 bits
          </p>
          <p class="text-muted-foreground mt-1 text-sm">
            Publicada em {formatDateTime(data.release.publishedAt)}
          </p>
        </div>
        <ActionButton
          data={{ label: 'Baixar instalador', loadingLabel: 'Preparando…' }}
          ui={{ icon: Download }}
          state={{ isLoading: state.downloading === 'msi', isDisabled: isAnyDownloading }}
          actions={{ onClick: () => actions.onDownload('msi') }}
        />
      </div>
      <p class="text-muted-foreground mt-3 text-sm">MSI · {megabytes(data.release.sizeBytes)} MB</p>

      <div class="mt-6 border-t border-border pt-5">
        <h3 class="text-foreground font-semibold">Primeira instalação</h3>
        <p class="text-muted-foreground mt-2 text-sm">
          Baixe os três arquivos e mantenha todos na mesma pasta. Você precisará de permissão de
          administrador no Windows.
        </p>
        <ol class="text-foreground mt-4 list-decimal space-y-3 pl-5 text-sm">
          <li>
            Baixe o certificado e o script abaixo. Abra o PowerShell como administrador nessa pasta
            e execute: <code class="mt-2 block break-all"
              >powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install-certificate.ps1</code
            >
          </li>
          <li>Abra o instalador MSI e conclua a instalação do agente.</li>
          <li>
            Peça à equipe de Infraestrutura a chave do computador para conectar o agente ao
            inventário.
          </li>
        </ol>
        <div class="mt-5 flex flex-wrap gap-3">
          <ActionButton
            data={{ label: 'Baixar certificado', loadingLabel: 'Preparando…' }}
            ui={{ variant: 'secondary', icon: Download }}
            state={{
              isLoading: state.downloading === 'certificate',
              isDisabled: isAnyDownloading,
            }}
            actions={{ onClick: () => actions.onDownload('certificate') }}
          />
          <ActionButton
            data={{ label: 'Baixar script do certificado', loadingLabel: 'Preparando…' }}
            ui={{ variant: 'secondary', icon: Download }}
            state={{
              isLoading: state.downloading === 'certificateScript',
              isDisabled: isAnyDownloading,
            }}
            actions={{ onClick: () => actions.onDownload('certificateScript') }}
          />
        </div>
        <p class="text-muted-foreground mt-4 text-sm">
          O agente coleta informações para a Infraestrutura. O acesso por Sistema permite baixar os
          mesmos arquivos; o inventário continua na Infraestrutura.
        </p>
      </div>
    </section>
  {/if}

  <!-- Todas as versões publicadas no R2: a LTS é a recomendada, mas qualquer uma baixa — é o
       caminho para voltar uma máquina para a versão anterior. -->
  <section
    class="rounded-surface border border-border bg-card p-6 shadow-xs"
    aria-label="Todas as versões"
  >
    <h2 class="text-foreground font-semibold">Todas as versões</h2>
    <p class="text-muted-foreground mt-1 text-sm">
      Os instaladores publicados, do mais novo para o mais antigo. Prefira a LTS.
    </p>

    {#if state.isLoadingReleases}
      <p role="status" class="text-muted-foreground mt-4 text-sm">Consultando as versões…</p>
    {:else if state.releasesError}
      <div class="mt-4">
        <ErrorState
          data={{ title: 'Não consegui listar as versões', message: state.releasesError }}
          ui={{ variant: 'inline' }}
          actions={{ onRetry: actions.onRetry }}
        />
      </div>
    {:else if data.releases.length === 0}
      <p class="text-muted-foreground bg-muted/40 rounded-box mt-4 p-3 text-sm">
        Nenhuma versão do agente foi publicada ainda.
      </p>
    {:else}
      <ul class="mt-4 divide-y divide-border">
        {#each data.releases as item (item.version)}
          <li class="flex flex-wrap items-center justify-between gap-3 py-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-foreground font-semibold">{item.version}</span>
                {#if item.isLts}
                  <StatusBadge data={{ label: 'LTS' }} ui={{ tone: 'success', size: 'sm' }} />
                {/if}
              </div>
              <p class="text-muted-foreground mt-0.5 text-xs">
                {formatDateTime(item.publishedAt)} · {megabytes(item.sizeBytes)} MB
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              {#each VERSION_FILES as file (file.kind)}
                <ActionButton
                  data={{ label: file.label, loadingLabel: 'Preparando…' }}
                  ui={{ variant: 'secondary', size: 'sm', icon: Download }}
                  state={{
                    isLoading: isPreparing(item.version, file.kind),
                    isDisabled: isAnyDownloading,
                  }}
                  actions={{ onClick: () => actions.onDownloadVersion(item.version, file.kind) }}
                />
              {/each}
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  {#if state.downloadError}
    <ErrorState
      data={{ title: 'Não consegui preparar o download', message: state.downloadError }}
      actions={{ onRetry: actions.onRetry }}
    />
  {/if}
</div>
