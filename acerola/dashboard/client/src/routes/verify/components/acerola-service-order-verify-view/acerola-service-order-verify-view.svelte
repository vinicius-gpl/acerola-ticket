<script lang="ts" module>
  import { shortServiceOrderCode } from '@template/shared/domain/service-order.util';
  import { ticketStatusLabel, ticketStatusTone } from '@template/shared/domain/ticket-status.util';
  import { type PublicServiceOrder } from '@template/shared/schemas/service-order.schema';

  /** Ver `use-service-order-verify`: o resultado de conferir um arquivo. */
  export type ServiceOrderFileCheck = 'idle' | 'checking' | 'match' | 'mismatch' | 'unreadable';

  /**
   * A CONFERÊNCIA PÚBLICA de uma ordem de serviço emitida.
   *
   * Função pura de props: não busca nada nem calcula impressão digital — recebe o registro e o
   * resultado prontos, e por isso abre no Storybook em qualquer estado.
   *
   * A tela separa DOIS níveis, e diz qual é qual: o registro (esta emissão existe, e foi isto
   * que o sistema emitiu) e o arquivo (o PDF que você tem é exatamente o emitido). Sem a
   * separação, quem abrisse o link de um PDF adulterado leria "ordem de serviço válida" e
   * pararia ali.
   */
  export type AcerolaServiceOrderVerifyViewProps = {
    data: {
      order: PublicServiceOrder | null;
      checkedFileName: string | null;
    };
    state?: {
      isLoading?: boolean;
      isNotFound?: boolean;
      error?: string | null;
      fileCheck?: ServiceOrderFileCheck;
    };
    actions: {
      onRetry: () => void;
      onFileChosen: (file: File | null) => void;
    };
  };

  const CHECK_MESSAGES: Record<Exclude<ServiceOrderFileCheck, 'idle'>, { title: string; text: string }> = {
    checking: { title: 'Conferindo o arquivo…', text: 'Só um instante.' },
    match: {
      title: 'Confere',
      text: 'Este arquivo é exatamente o que o sistema emitiu. Nada nele foi alterado.',
    },
    mismatch: {
      title: 'Não confere',
      text: 'Este arquivo não é o que o sistema emitiu neste registro: foi alterado depois de emitido, ou é de outra versão ou de outro chamado.',
    },
    unreadable: {
      title: 'Não consegui ler este arquivo',
      text: 'Escolha o PDF da ordem de serviço, do jeito que ele foi baixado.',
    },
  };

  const CHECK_CLASSES: Record<Exclude<ServiceOrderFileCheck, 'idle'>, string> = {
    checking: 'border-border bg-muted/40 text-foreground',
    match: 'border-success/40 bg-success-soft text-foreground',
    mismatch: 'border-destructive/40 bg-destructive-soft text-foreground',
    unreadable: 'border-warning/40 bg-warning-soft text-foreground',
  };
</script>

<script lang="ts">
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import CircleX from '@lucide/svelte/icons/circle-x';
  import FileSearch from '@lucide/svelte/icons/file-search';
  import LoaderCircle from '@lucide/svelte/icons/loader-circle';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import Upload from '@lucide/svelte/icons/upload';

  import EmptyState from '$lib/components/acerola-empty-state/acerola-empty-state.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import {
    formatHistoryDateTime,
    formatMinutesSpent,
  } from '$lib/components/acerola-history-timeline/acerola-history-timeline.svelte';
  import StatusBadge from '$lib/components/acerola-status-badge/acerola-status-badge.svelte';
  import { cn } from '$lib/utils/cn';

  let { data, state: viewState, actions }: AcerolaServiceOrderVerifyViewProps = $props();

  const order = $derived(data.order);
  const fileCheck = $derived(viewState?.fileCheck ?? 'idle');

  const CHECK_ICONS = {
    checking: LoaderCircle,
    match: CircleCheck,
    mismatch: CircleX,
    unreadable: TriangleAlert,
  } as const;

  function handleFile(event: Event & { currentTarget: HTMLInputElement }): void {
    actions.onFileChosen(event.currentTarget.files?.[0] ?? null);
    /* Limpar o campo deixa a pessoa escolher o MESMO arquivo de novo e ver a conferência
       acontecer outra vez — sem isso, o navegador não avisa a segunda escolha. */
    event.currentTarget.value = '';
  }
</script>

{#snippet field(label: string, value: string)}
  <div class="flex flex-col gap-0.5">
    <dt class="text-muted-foreground text-xs">{label}</dt>
    <dd class="text-foreground text-sm font-semibold">{value}</dd>
  </div>
{/snippet}

<!-- Estados na frente, conteúdo por último e sem aninhamento (CONTRIBUTING §2). -->
{#if viewState?.error}
  <ErrorState
    data={{ title: 'Não consegui conferir agora', message: viewState.error }}
    actions={{ onRetry: actions.onRetry }}
  />
{:else if viewState?.isNotFound}
  <EmptyState
    data={{
      title: 'Não encontrei esta ordem de serviço',
      description:
        'Nenhum documento foi emitido com este código. Confira se o endereço foi copiado inteiro — ou se o documento é mesmo deste sistema.',
    }}
    ui={{ icon: FileSearch }}
  />
{:else if viewState?.isLoading || !order}
  <p class="text-muted-foreground py-16 text-center text-sm">Procurando o registro…</p>
{:else}
  <div class="flex flex-col gap-5">
    <section class="rounded-surface border-border bg-card flex flex-col gap-4 border p-5">
      <header class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-foreground text-lg font-bold">Ordem de serviço {order.protocol}</h2>
          <p class="text-muted-foreground text-sm">
            Este documento foi emitido pelo sistema. Abaixo está o que ele registrou na emissão.
          </p>
        </div>
        <StatusBadge data={{ label: `Versão ${order.version}` }} ui={{ tone: 'brand' }} />
      </header>

      {#if !order.isLatest}
        <p class="rounded-box border-warning/40 bg-warning-soft text-foreground border px-3.5 py-3 text-sm">
          Existe uma emissão mais nova deste chamado (versão {order.latestVersion}). Esta continua
          verdadeira como retrato do dia em que foi emitida, mas o chamado mudou depois.
        </p>
      {/if}

      <dl class="grid gap-4 sm:grid-cols-3">
        {@render field('Emitida em', formatHistoryDateTime(order.issuedAt))}
        <div class="flex flex-col gap-0.5">
          <dt class="text-muted-foreground text-xs">Estágio na emissão</dt>
          <dd>
            <StatusBadge
              data={{ label: ticketStatusLabel(order.statusAtIssue) }}
              ui={{ tone: ticketStatusTone(order.statusAtIssue), size: 'sm' }}
            />
          </dd>
        </div>
        {@render field('Históricos no documento', String(order.historyCount))}
        {@render field(
          'Tempo registrado',
          order.totalMinutes === null ? '—' : formatMinutesSpent(order.totalMinutes),
        )}
        <div class="flex flex-col gap-0.5">
          <dt class="text-muted-foreground text-xs">Código de verificação</dt>
          <dd class="text-foreground font-mono text-sm font-semibold" title={order.code}>
            {shortServiceOrderCode(order.code)}
          </dd>
        </div>
        <div class="flex flex-col gap-0.5">
          <dt class="text-muted-foreground text-xs">Impressão digital do arquivo</dt>
          <dd class="text-foreground font-mono text-sm font-semibold" title={order.fileHash}>
            {shortServiceOrderCode(order.fileHash)}
          </dd>
        </div>
      </dl>

      <details class="text-muted-foreground text-xs">
        <summary class="cursor-pointer select-none">Ver o código e a impressão digital inteiros</summary>
        <dl class="mt-2 flex flex-col gap-2">
          <div>
            <dt>Código</dt>
            <dd class="text-foreground font-mono break-all">{order.code}</dd>
          </div>
          <div>
            <dt>Impressão digital (SHA-256)</dt>
            <dd class="text-foreground font-mono break-all">{order.fileHash}</dd>
          </div>
        </dl>
      </details>
    </section>

    <section class="rounded-surface border-border bg-card flex flex-col gap-4 border p-5">
      <header>
        <h2 class="text-foreground text-lg font-bold">Conferir o arquivo</h2>
        <p class="text-muted-foreground text-sm">
          O registro acima prova que a emissão existe. Para ter certeza de que o PDF que você
          recebeu não foi alterado, escolha o arquivo: ele é conferido aqui, no seu navegador, e não
          é enviado para lugar nenhum.
        </p>
      </header>

      <label
        class={cn(
          'control-lg rounded-control border-input bg-card text-foreground inline-flex w-full cursor-pointer items-center justify-center gap-2 border text-sm font-medium transition-colors sm:w-auto sm:self-start',
          'hover:bg-muted/60 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-2',
          'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60',
        )}
      >
        <Upload class="size-4" aria-hidden="true" />
        Escolher o PDF
        <input
          type="file"
          accept="application/pdf,.pdf"
          class="sr-only"
          disabled={fileCheck === 'checking'}
          onchange={handleFile}
        />
      </label>

      <!-- `aria-live`: o resultado aparece depois do clique, longe do botão — quem usa leitor
           de tela precisa ouvi-lo chegar. O resultado é dito com PALAVRAS e ícone, não só cor. -->
      <div aria-live="polite">
        {#if fileCheck !== 'idle'}
          {@const CheckIcon = CHECK_ICONS[fileCheck]}
          <div class={cn('rounded-box flex items-start gap-3 border px-4 py-3.5', CHECK_CLASSES[fileCheck])}>
            <CheckIcon
              class={cn('mt-0.5 size-5 shrink-0', fileCheck === 'checking' && 'animate-spin')}
              aria-hidden="true"
            />
            <div class="min-w-0">
              <p class="text-sm font-semibold">{CHECK_MESSAGES[fileCheck].title}</p>
              <p class="text-sm">{CHECK_MESSAGES[fileCheck].text}</p>
              {#if data.checkedFileName}
                <p class="text-muted-foreground mt-1 truncate text-xs">{data.checkedFileName}</p>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </section>
  </div>
{/if}
