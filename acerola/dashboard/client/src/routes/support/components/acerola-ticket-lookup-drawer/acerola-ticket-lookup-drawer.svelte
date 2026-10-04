<script lang="ts" module>
  import {
    ticketDepartmentLabel,
    ticketProblemTypeLabel,
  } from '@template/shared/domain/ticket-catalog.util';
  import {
    ticketPriorityLabel,
    ticketPriorityTone,
    ticketStatusLabel,
    ticketStatusTone,
  } from '@template/shared/domain/ticket-status.util';
  import { type PublicTicket } from '@template/shared/schemas/ticket.schema';

  /**
   * A consulta PÚBLICA de um chamado pelo protocolo, num drawer que cobre a tela.
   *
   * Função pura de props: não busca nada. Abre no Storybook fechada, procurando, com o
   * chamado encontrado, com "não encontrado" e em erro.
   *
   * Vive num drawer, e não numa seção fixa da página, porque a maior parte de quem entra
   * nesta tela veio ABRIR um chamado, não consultar um — deixar a consulta fora do fluxo
   * principal é o que dá à página inteira espaço para o formulário em etapas, sem scroll.
   *
   * O chamado que chega aqui já vem podado pelo servidor — sem telefone e sem responsável, e
   * da linha do tempo só os históricos que o TI marcou como visíveis para quem abriu. Esta
   * tela não esconde nada: ela simplesmente não recebe.
   */
  export type AcerolaTicketLookupDrawerProps = {
    data: {
      protocol: string;
      ticket: PublicTicket | null;
    };
    state: {
      isOpen: boolean;
      isSearching?: boolean;
      isInvalid?: boolean;
      isNotFound?: boolean;
      error?: string | null;
    };
    actions: {
      onProtocolChange: (protocol: string) => void;
      onSearch: () => void;
      onClose: () => void;
    };
  };
</script>

<script lang="ts">
  import Building2 from '@lucide/svelte/icons/building-2';
  import ImageIcon from '@lucide/svelte/icons/image';
  import MonitorSmartphone from '@lucide/svelte/icons/monitor-smartphone';
  import Wrench from '@lucide/svelte/icons/wrench';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import HistoryTimeline from '$lib/components/acerola-history-timeline/acerola-history-timeline.svelte';
  import StatusBadge from '$lib/components/acerola-status-badge/acerola-status-badge.svelte';
  import TextField from '$lib/components/acerola-text-field/acerola-text-field.svelte';
  import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
  } from '$lib/components/acerola-sheet/acerola-sheet';

  let { data, state, actions }: AcerolaTicketLookupDrawerProps = $props();

  const ticket = $derived(data.ticket);

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSearch();
  }

  function formatDateTime(value: string): string {
    return new Date(value).toLocaleString('pt-BR');
  }
</script>

<Sheet open={state.isOpen} onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onClose())}>
  <SheetContent side="right" class="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl">
    <SheetHeader class="border-b border-border/70">
      <SheetTitle class="text-lg">Consultar chamado</SheetTitle>
      <SheetDescription>Digite o protocolo para ver a situação — sem precisar de senha.</SheetDescription>
    </SheetHeader>

    <div class="flex flex-col gap-5 p-5">
      <form novalidate class="flex flex-col gap-3 sm:flex-row sm:items-end" onsubmit={handleSubmit}>
        <TextField
          data={{
            label: 'Número do protocolo',
            name: 'protocol',
            value: data.protocol,
            placeholder: 'Ex: CH-0001',
          }}
          ui={{ className: 'flex-1' }}
          state={{
            /* O aviso aparece enquanto a pessoa digita porque aqui ele não acusa erro: ele
               explica por que o botão ainda não funciona. */
            error: state.isInvalid ? 'Digite o número do protocolo, como CH-0001.' : null,
            isDisabled: state.isSearching,
            isAutoFocused: true,
          }}
          actions={{ onChange: actions.onProtocolChange }}
        />

        <ActionButton
          data={{ label: 'Consultar', loadingLabel: 'Procurando…' }}
          ui={{ variant: 'secondary' }}
          state={{ isLoading: state.isSearching, isDisabled: state.isInvalid }}
          actions={{ onClick: actions.onSearch }}
        />
      </form>

      <!-- Estados na frente, conteúdo por último e sem aninhamento (CONTRIBUTING §2). -->
      {#if state.error}
        <ErrorState data={{ message: state.error }} ui={{ variant: 'inline' }} />
      {:else if state.isNotFound}
        <!-- "Não encontrado" é resposta, não falha do site — por isso não vem em vermelho. -->
        <p class="text-ink-700 bg-muted/40 rounded-box p-3 text-sm">
          Não encontrei nenhum chamado com esse protocolo. Confira o número que você anotou.
        </p>
      {:else if ticket}
        <div class="flex flex-col gap-3.5 rounded-surface border border-border/80 bg-muted/20 p-4.5 shadow-xs">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="font-mono text-base font-bold text-foreground">{ticket.protocol}</span>
            <span class="text-xs text-muted-foreground">{formatDateTime(ticket.createdAt)}</span>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <StatusBadge
              data={{ label: ticketStatusLabel(ticket.status) }}
              ui={{ tone: ticketStatusTone(ticket.status), size: 'sm' }}
            />
            <StatusBadge
              data={{ label: ticketPriorityLabel(ticket.priority) }}
              ui={{ tone: ticketPriorityTone(ticket.priority), size: 'sm' }}
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="flex items-start gap-2">
              <span class="flex size-7 shrink-0 items-center justify-center rounded-chip bg-ink-100/60 text-ink-700">
                <Building2 class="size-3.5" aria-hidden="true" />
              </span>
              <div class="min-w-0">
                <p class="text-xs font-semibold tracking-wider text-ink-500 uppercase">Departamento</p>
                <p class="truncate text-xs font-medium text-foreground">{ticketDepartmentLabel(ticket.department)}</p>
              </div>
            </div>

            <div class="flex items-start gap-2">
              <span class="flex size-7 shrink-0 items-center justify-center rounded-chip bg-ink-100/60 text-ink-700">
                <Wrench class="size-3.5" aria-hidden="true" />
              </span>
              <div class="min-w-0">
                <p class="text-xs font-semibold tracking-wider text-ink-500 uppercase">Tipo</p>
                <p class="truncate text-xs font-medium text-foreground">{ticketProblemTypeLabel(ticket.problemType)}</p>
              </div>
            </div>

            {#if ticket.anydeskId}
              <div class="col-span-2 flex items-start gap-2">
                <span class="flex size-7 shrink-0 items-center justify-center rounded-chip bg-ink-100/60 text-ink-700">
                  <MonitorSmartphone class="size-3.5" aria-hidden="true" />
                </span>
                <div class="min-w-0">
                  <p class="text-xs font-semibold tracking-wider text-ink-500 uppercase">AnyDesk</p>
                  <p class="truncate font-mono text-xs font-medium text-foreground">{ticket.anydeskId}</p>
                </div>
              </div>
            {/if}
          </div>

          <div class="rounded-box border border-border/80 bg-card p-3.5 text-xs leading-relaxed text-foreground shadow-xs">
            <p class="mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Aberto por {ticket.requesterName}</p>
            <p class="text-sm whitespace-pre-line text-foreground/90">{ticket.description}</p>
          </div>

          {#if ticket.screenshotUrl}
            <a
              class="control-sm inline-flex w-fit items-center gap-1.5 rounded-control border border-border bg-card text-xs font-semibold text-primary shadow-xs transition-colors hover:bg-ink-100"
              href={ticket.screenshotUrl}
              target="_blank"
              rel="noopener"
            >
              <ImageIcon class="size-3.5" aria-hidden="true" />
              Abrir o print enviado
            </a>
          {/if}

          <!-- O ANDAMENTO: é o que a pessoa veio buscar. "Aguardando a peça chegar" responde
               mais do que o selo da situação sozinho. -->
          <div class="border-border/70 flex flex-col gap-3 border-t pt-3.5">
            <p class="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Andamento
            </p>
            <HistoryTimeline
              data={{ histories: ticket.histories }}
              ui={{ emptyLabel: 'Ainda não há andamento registrado neste chamado.' }}
            />
          </div>
        </div>
      {/if}
    </div>
  </SheetContent>
</Sheet>
