<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query';
  import {
    TIMELINE_EVENT_TYPE_LABELS,
  } from '@template/shared/domain/software-project.util';
  import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import GitMerge from '@lucide/svelte/icons/git-merge';
  import GitPullRequest from '@lucide/svelte/icons/git-pull-request';
  import LifeBuoy from '@lucide/svelte/icons/life-buoy';
  import { writable } from 'svelte/store';

  import { readError } from '$lib/api/http-client';
  import { softwareTimelineApi } from '$lib/api/software-timeline.api';
  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';

  let {
    open = $bindable(false),
    project,
    onClose,
  }: {
    open: boolean;
    project: SoftwareProject;
    onClose: () => void;
  } = $props();

  const query = mirrorStore(
    createQuery(
      writable({
        queryKey: ['software-timeline', project.id],
        queryFn: () => softwareTimelineApi.list({ projectId: project.id, pageSize: 50 }),
      }),
    ),
  );

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
    <div class="flex max-h-[85vh] w-full max-w-2xl flex-col gap-4 rounded-surface border border-border bg-card p-6 shadow-xl">
      <div class="flex items-center justify-between border-b border-border/60 pb-4">
        <div>
          <h2 class="text-base font-semibold text-foreground">
            Timeline — {project.name}
          </h2>
          <p class="text-xs text-muted-foreground">
            Histórico cronológico de Pull Requests sincronizados e chamados do sistema.
          </p>
        </div>
        <button
          type="button"
          class="text-xs text-muted-foreground hover:text-foreground"
          onclick={onClose}
        >
          ✕
        </button>
      </div>

      <div class="flex-1 overflow-y-auto pr-2">
        {#if query.current.isPending}
          <div class="flex h-48 flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
            <div class="size-6 animate-spin rounded-full border-2 border-border border-t-primary"></div>
            <span>Carregando timeline…</span>
          </div>
        {:else if query.current.error}
          <div class="rounded-box border border-destructive/40 bg-destructive-soft p-4 text-xs text-destructive">
            {readError(query.current.error)}
          </div>
        {:else}
          {@const items = query.current.data?.items ?? []}
          {#if items.length === 0}
            <div class="grid h-48 place-items-center text-center text-xs text-muted-foreground">
              Nenhum evento ou Pull Request registrado nesta timeline ainda.<br />
              Clique em "Sincronizar" no card do sistema para buscar os PRs do GitHub.
            </div>
          {:else}
            <div class="relative flex flex-col gap-6 pl-6 before:absolute before:bottom-2 before:left-2.5 before:top-2 before:w-0.5 before:bg-border">
              {#each items as event}
                <div class="relative flex flex-col gap-1">
                  <!-- Ponto na linha do tempo -->
                  <div class="absolute -left-6 top-1 grid size-5 place-items-center rounded-full bg-card ring-2 ring-border">
                    {#if event.type === 'pr' && event.status === 'merged'}
                      <GitMerge class="size-3 text-primary" />
                    {:else if event.type === 'pr'}
                      <GitPullRequest class="size-3 text-primary" />
                    {:else}
                      <LifeBuoy class="size-3 text-primary" />
                    {/if}
                  </div>

                  <!-- Conteúdo do evento -->
                  <div class="rounded-box border border-border bg-muted/40 p-3">
                    <div class="flex items-center justify-between gap-2">
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-semibold text-foreground">
                          {event.title}
                        </span>
                        {#if event.externalId}
                          <span class="rounded-chip bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-foreground">
                            {event.externalId}
                          </span>
                        {/if}
                      </div>
                      <span class="text-xs text-muted-foreground">
                        {formatDate(event.eventDate)}
                      </span>
                    </div>

                    <div class="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {TIMELINE_EVENT_TYPE_LABELS[event.type] ?? event.type}
                        {event.author ? `· por ${event.author}` : ''}
                      </span>
                      {#if event.url}
                        <a
                          href={event.url}
                          target="_blank"
                          rel="noreferrer"
                          class="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                        >
                          Ver no GitHub
                          <ArrowUpRight class="size-3" />
                        </a>
                      {/if}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </div>

      <div class="flex items-center justify-end border-t border-border/60 pt-4">
        <ActionButton
          data={{ label: 'Fechar' }}
          ui={{ variant: 'secondary' }}
          actions={{ onClick: onClose }}
        />
      </div>
    </div>
  </div>
{/if}
