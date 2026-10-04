<script lang="ts" module>
  import {
    isClosingTicketHistoryType,
    ticketHistoryTone,
    ticketHistoryTypeLabel,
  } from '@template/shared/domain/ticket-history.util';
  import { ticketStatusLabel } from '@template/shared/domain/ticket-status.util';
  import {
    type PublicTicketHistory,
    type TicketHistory,
  } from '@template/shared/schemas/ticket-history.schema';

  /**
   * Um histórico como a linha do tempo o recebe.
   *
   * O painel manda o histórico inteiro; a consulta pública manda a versão podada, sem o tempo
   * gasto nem a marca de visibilidade. Os dois campos são opcionais por isso — a linha do tempo
   * mostra o que vier, e não inventa o que não veio.
   */
  export type HistoryTimelineEntry = PublicTicketHistory &
    Partial<Pick<TicketHistory, 'minutesSpent' | 'isVisibleToRequester'>>;

  /**
   * A LINHA DO TEMPO de um chamado: cada histórico com quem, quando, o quê e de que tipo.
   *
   * Função pura de props. É genérica porque duas telas a usam: a ficha do chamado no painel e
   * a consulta pública por protocolo — a mesma história, lida por dois públicos.
   *
   * O histórico que ENCERRA é dito com palavras ("Encerrou o chamado"), e não só com a cor do
   * selo: cor sozinha some para quem não distingue as cores e some na impressão.
   */
  export type AcerolaHistoryTimelineProps = {
    data: { histories: HistoryTimelineEntry[] };
    ui?: { emptyLabel?: string; className?: string };
    state?: { isLoading?: boolean; error?: string | null };
  };

  const MINUTES_PER_HOUR = 60;

  /** "45 min", "2 h", "1 h 30 min". */
  export function formatMinutesSpent(minutes: number): string {
    if (minutes < MINUTES_PER_HOUR) return `${minutes} min`;

    const hours = Math.floor(minutes / MINUTES_PER_HOUR);
    const rest = minutes % MINUTES_PER_HOUR;

    return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
  }

  /** A bolinha da linha, na cor do tipo — a mesma do selo ao lado. */
  const DOT_TONE_CLASSES = {
    neutral: 'bg-muted-foreground',
    info: 'bg-info',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-destructive',
    brand: 'bg-primary',
  } as const;
</script>

<script lang="ts">
  import EyeOff from '@lucide/svelte/icons/eye-off';
  import Lock from '@lucide/svelte/icons/lock';

  import AttachmentList from '$lib/components/acerola-attachment-list/acerola-attachment-list.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import StatusBadge from '$lib/components/acerola-status-badge/acerola-status-badge.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state }: AcerolaHistoryTimelineProps = $props();

  function formatDateTime(value: string): string {
    return new Date(value).toLocaleString('pt-BR');
  }
</script>

<!-- Estados na frente, conteúdo por último e sem aninhamento (CONTRIBUTING §2). -->
{#if state?.error}
  <ErrorState data={{ message: state.error }} ui={{ variant: 'inline' }} />
{:else if state?.isLoading}
  <p class="text-muted-foreground text-sm">Carregando a linha do tempo…</p>
{:else if data.histories.length === 0}
  <p class="text-muted-foreground text-sm">
    {ui?.emptyLabel ?? 'Nenhum histórico registrado ainda.'}
  </p>
{:else}
  <ol class={cn('flex flex-col', ui?.className)}>
    {#each data.histories as history, index (history.id)}
      {@const tone = ticketHistoryTone(history.type)}
      {@const isLast = index === data.histories.length - 1}
      <li class="flex gap-3">
        <div class="flex flex-col items-center pt-1.5">
          <span class={cn('size-2.5 shrink-0 rounded-full', DOT_TONE_CLASSES[tone])} aria-hidden="true"></span>
          {#if !isLast}
            <span class="bg-border mt-1 w-px flex-1" aria-hidden="true"></span>
          {/if}
        </div>

        <div class={cn('flex min-w-0 flex-1 flex-col gap-1.5', isLast ? 'pb-0' : 'pb-5')}>
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusBadge data={{ label: ticketHistoryTypeLabel(history.type) }} ui={{ tone, size: 'sm' }} />
            <span class="text-foreground text-sm font-medium">{history.authorName}</span>
            <time class="text-muted-foreground text-xs" datetime={history.createdAt}>
              {formatDateTime(history.createdAt)}
            </time>
          </div>

          <div class="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span>Estágio: {ticketStatusLabel(history.statusAfter)}</span>
            {#if history.minutesSpent !== undefined && history.minutesSpent !== null}
              <span>Tempo: {formatMinutesSpent(history.minutesSpent)}</span>
            {/if}
            {#if isClosingTicketHistoryType(history.type)}
              <span class="text-foreground inline-flex items-center gap-1 font-semibold">
                <Lock class="size-3" aria-hidden="true" />
                Encerrou o chamado
              </span>
            {/if}
            {#if history.isVisibleToRequester === false}
              <span class="inline-flex items-center gap-1">
                <EyeOff class="size-3" aria-hidden="true" />
                Interno — quem abriu não vê
              </span>
            {/if}
          </div>

          <p class="text-foreground/90 text-sm whitespace-pre-line">{history.description}</p>

          {#if history.attachments.length > 0}
            <AttachmentList data={{ attachments: history.attachments }} ui={{ actor: 'requester' }} />
          {/if}
        </div>
      </li>
    {/each}
  </ol>
{/if}
