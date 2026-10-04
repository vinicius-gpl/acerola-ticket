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

  /** O halo em volta do marco: a mesma cor, quase transparente — destaca sem pesar. */
  const HALO_TONE_CLASSES = {
    neutral: 'ring-muted-foreground/15',
    info: 'ring-info/20',
    success: 'ring-success/20',
    warning: 'ring-warning/20',
    danger: 'ring-destructive/20',
    brand: 'ring-primary/20',
  } as const;

  /** "02/10/2026 às 23:30" — sem os segundos, que ninguém lê numa linha do tempo. */
  export function formatHistoryDateTime(value: string): string {
    const date = new Date(value);
    const day = date.toLocaleDateString('pt-BR');
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return `${day} às ${time}`;
  }
</script>

<script lang="ts">
  import Clock from '@lucide/svelte/icons/clock';
  import EyeOff from '@lucide/svelte/icons/eye-off';
  import Flag from '@lucide/svelte/icons/flag';
  import Lock from '@lucide/svelte/icons/lock';

  import AttachmentList from '$lib/components/acerola-attachment-list/acerola-attachment-list.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import StatusBadge from '$lib/components/acerola-status-badge/acerola-status-badge.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state }: AcerolaHistoryTimelineProps = $props();
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
      {@const isFirst = index === 0}
      {@const isLast = index === data.histories.length - 1}
      <li class="flex gap-4">
        <!-- O TRILHO: um traço contínuo de cima a baixo, com o marco de cada histórico no meio.
             O pedaço de cima some no primeiro e o de baixo no último — a linha começa e termina
             num marco, e não solta no ar. O marco fica na altura do cabeçalho ao lado (24px). -->
        <div class="flex w-3 shrink-0 flex-col items-center" aria-hidden="true">
          <span class={cn('h-0.5 w-px', isFirst ? 'bg-transparent' : 'bg-border')}></span>
          <span
            class={cn('my-1 size-3 shrink-0 rounded-full ring-4', DOT_TONE_CLASSES[tone], HALO_TONE_CLASSES[tone])}
          ></span>
          {#if !isLast}
            <span class="bg-border w-px flex-1"></span>
          {/if}
        </div>

        <div class={cn('flex min-w-0 flex-1 flex-col gap-2', isLast ? 'pb-0' : 'pb-6')}>
          <!-- Tipo e autor à esquerda, a hora à direita: três tamanhos de letra na mesma fileira
               só alinham se a fileira tiver altura fixa e cada um se centrar nela. -->
          <div class="flex min-h-6 flex-wrap items-center gap-x-2.5 gap-y-1">
            <StatusBadge data={{ label: ticketHistoryTypeLabel(history.type) }} ui={{ tone, size: 'sm' }} />
            <span class="text-foreground min-w-0 truncate text-sm leading-6 font-medium">
              {history.authorName}
            </span>
            <time
              class="text-muted-foreground ml-auto text-xs leading-6 tabular-nums"
              datetime={history.createdAt}
            >
              {formatHistoryDateTime(history.createdAt)}
            </time>
          </div>

          <div class="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span class="inline-flex items-center gap-1">
              <Flag class="size-3" aria-hidden="true" />
              Estágio: {ticketStatusLabel(history.statusAfter)}
            </span>
            {#if history.minutesSpent !== undefined && history.minutesSpent !== null}
              <span class="inline-flex items-center gap-1">
                <Clock class="size-3" aria-hidden="true" />
                Tempo: {formatMinutesSpent(history.minutesSpent)}
              </span>
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

          <p
            class="rounded-box border-border/70 bg-muted/20 text-foreground/90 border px-3.5 py-2.5 text-sm whitespace-pre-line"
          >
            {history.description}
          </p>

          {#if history.attachments.length > 0}
            <AttachmentList data={{ attachments: history.attachments }} ui={{ actor: 'requester' }} />
          {/if}
        </div>
      </li>
    {/each}
  </ol>
{/if}
