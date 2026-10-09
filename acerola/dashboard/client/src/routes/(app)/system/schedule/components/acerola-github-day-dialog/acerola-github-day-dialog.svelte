<script lang="ts">
  import type { SoftwareScheduleModel } from '$lib/hooks/use-software-schedule/use-software-schedule.svelte';
  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/acerola-dialog/acerola-dialog';
  import PaginationBar from '$lib/components/acerola-pagination-bar/acerola-pagination-bar.svelte';

  let {
    data,
    actions,
  }: {
    data: NonNullable<SoftwareScheduleModel['data']['githubDay']>;
    actions: { onClose: () => void; onPageChange: (page: number) => void };
  } = $props();
  const noun = $derived(
    data.type === 'issue'
      ? (['issue', 'issues'] as const)
      : data.type === 'all'
        ? (['atividade', 'atividades'] as const)
        : (['PR', 'PRs'] as const),
  );
  const title = $derived(
    data.type === 'issue' ? 'Issues' : data.type === 'all' ? 'Atividades do GitHub' : 'PRs',
  );
</script>

<Dialog open onOpenChange={(open) => !open && actions.onClose()}>
  <DialogContent class="max-w-2xl">
    <DialogHeader>
      <DialogTitle>{title} do dia {data.date.split('-').reverse().join('/')}</DialogTitle>
      <DialogDescription>
        Do mais cedo ao mais tarde, no horário local. PRs mergeados usam o horário do merge; os
        demais, o da criação. Issues resolvidas usam o horário de fechamento; abertas, o de criação.
      </DialogDescription>
    </DialogHeader>
    <div class="max-h-[60vh] space-y-3 overflow-y-auto">
      {#each data.items as event (event.id)}
        <article class="rounded-box border border-border bg-muted/20 p-3">
          <div class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <time
              datetime={event.eventDate}
              class="font-mono font-semibold text-foreground tabular-nums"
              >{new Date(event.eventDate).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}</time
            >
            <span
              >{event.type === 'issue'
                ? event.status === 'closed'
                  ? 'Resolvida'
                  : 'Aberta'
                : event.status === 'merged'
                  ? 'Mergeado'
                  : event.status === 'closed'
                    ? 'Fechado'
                    : 'Aberto'}</span
            >
          </div>
          {#if event.url}
            <a
              href={event.url}
              target="_blank"
              rel="noreferrer"
              class="mt-2 block break-words text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >{data.type === 'all'
                ? event.type === 'issue'
                  ? 'Issue '
                  : 'PR '
                : ''}{event.externalId} · {event.title}</a
            >
          {:else}
            <p class="mt-2 break-words text-sm font-semibold">{event.externalId} · {event.title}</p>
          {/if}
          <p class="mt-1 break-words text-xs text-muted-foreground">
            {event.projectName ?? 'Projeto'} · por {event.authorName ??
              event.author ??
              'desconhecido'}
          </p>
        </article>
      {:else}
        <p class="py-4 text-center text-sm text-muted-foreground">
          {data.type === 'issue'
            ? 'Nenhuma issue sincronizada neste dia.'
            : data.type === 'all'
              ? 'Nenhuma atividade sincronizada neste dia.'
              : 'Nenhum PR sincronizado neste dia.'}
        </p>
      {/each}
    </div>
    <PaginationBar
      data={{ page: data.page, pageSize: data.pageSize, total: data.total, noun: [...noun] }}
      actions={{ onPageChange: actions.onPageChange }}
    />
  </DialogContent>
</Dialog>
