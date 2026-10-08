<script lang="ts">
  import { type SoftwareTimelineEvent } from '@template/shared/schemas/software-timeline.schema';

  import * as Tooltip from '$lib/components/ui/tooltip/index.js';

  let { event, compact = false }: { event: SoftwareTimelineEvent; compact?: boolean } = $props();

  const kind = $derived(event.type === 'pr' ? 'Pull Request' : 'Issue');
  const status = $derived(
    event.type === 'issue'
      ? event.status === 'closed'
        ? 'Resolvida'
        : 'Aberta'
      : event.status === 'merged'
        ? 'Mergeado'
        : event.status === 'closed'
          ? 'Fechado'
          : 'Aberto',
  );

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
</script>

<Tooltip.Root>
  <Tooltip.Trigger>
    {#snippet child({ props })}
      <a
        {...props}
        href={event.url ?? undefined}
        target="_blank"
        rel="noreferrer"
        aria-label="{kind} {event.externalId ?? ''}: {event.title}"
        class="block truncate rounded-chip border border-primary/20 bg-primary-soft text-primary transition hover:border-primary/50 {compact
          ? 'px-1 py-0.5 text-[10px]'
          : 'px-1.5 py-1 text-[10px]'}"
      >
        {event.type === 'pr' ? 'PR' : 'Issue'}
        {event.externalId} · {event.title}
      </a>
    {/snippet}
  </Tooltip.Trigger>

  <Tooltip.Content
    side="top"
    align="start"
    class="max-w-xs flex-col items-start gap-1.5 whitespace-normal"
  >
    <span class="font-semibold">{kind} {event.externalId} · {status}</span>
    <span>{event.title}</span>
    <span class="text-background/75">
      {event.projectName ?? 'Projeto'} · por {event.author ?? 'desconhecido'} · {formatDate(
        event.eventDate,
      )}
    </span>
  </Tooltip.Content>
</Tooltip.Root>
