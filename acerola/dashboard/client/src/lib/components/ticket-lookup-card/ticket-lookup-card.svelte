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
   * A consulta PÚBLICA de um chamado pelo protocolo.
   *
   * Função pura de props: não busca nada. Abre no Storybook vazia, procurando, com o chamado
   * encontrado, com "não encontrado" e em erro.
   *
   * O chamado que chega aqui já vem podado pelo servidor — sem telefone, sem responsável e
   * sem a solução. Esta tela não esconde nada: ela simplesmente não recebe.
   */
  export type TicketLookupCardProps = {
    data: {
      protocol: string;
      ticket: PublicTicket | null;
    };
    state: {
      isSearching?: boolean;
      isInvalid?: boolean;
      isNotFound?: boolean;
      error?: string | null;
    };
    actions: {
      onProtocolChange: (protocol: string) => void;
      onSearch: () => void;
    };
  };
</script>

<script lang="ts">
  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import ErrorState from '$lib/components/error-state/error-state.svelte';
  import StatusBadge from '$lib/components/status-badge/status-badge.svelte';
  import TextField from '$lib/components/text-field/text-field.svelte';

  let { data, state, actions }: TicketLookupCardProps = $props();

  const ticket = $derived(data.ticket);

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSearch();
  }

  function formatDateTime(value: string): string {
    return new Date(value).toLocaleString('pt-BR');
  }
</script>

<section class="bg-card rounded-xl border p-5">
  <h2 class="text-ink-900 mb-4 text-lg font-bold">Consultar chamado</h2>

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
      }}
      actions={{ onChange: actions.onProtocolChange }}
    />

    <ActionButton
      data={{ label: 'Consultar', loadingLabel: 'Procurando…' }}
      ui={{ variant: 'secondary', className: 'sm:mb-[2px]' }}
      state={{ isLoading: state.isSearching, isDisabled: state.isInvalid }}
      actions={{ onClick: actions.onSearch }}
    />
  </form>

  <!-- Estados na frente, conteúdo por último e sem aninhamento (CONTRIBUTING §2). -->
  {#if state.error}
    <div class="mt-4">
      <ErrorState data={{ message: state.error }} ui={{ variant: 'inline' }} />
    </div>
  {:else if state.isNotFound}
    <!-- "Não encontrado" é resposta, não falha do site — por isso não vem em vermelho. -->
    <p class="text-ink-700 bg-muted/40 mt-4 rounded-lg p-3 text-sm">
      Não encontrei nenhum chamado com esse protocolo. Confira o número que você anotou.
    </p>
  {:else if ticket}
    <dl class="bg-muted/40 mt-4 grid gap-2 rounded-lg p-4 text-sm sm:grid-cols-2">
      <div class="sm:col-span-2 flex flex-wrap items-center gap-2">
        <span class="text-ink-900 text-[1rem] font-bold">{ticket.protocol}</span>
        <StatusBadge
          data={{ label: ticketStatusLabel(ticket.status) }}
          ui={{ tone: ticketStatusTone(ticket.status), size: 'sm' }}
        />
        <StatusBadge
          data={{ label: ticketPriorityLabel(ticket.priority) }}
          ui={{ tone: ticketPriorityTone(ticket.priority), size: 'sm' }}
        />
      </div>

      <div>
        <dt class="text-ink-500 text-xs">Aberto por</dt>
        <dd class="text-ink-900">{ticket.requesterName}</dd>
      </div>
      <div>
        <dt class="text-ink-500 text-xs">Departamento</dt>
        <dd class="text-ink-900">{ticketDepartmentLabel(ticket.department)}</dd>
      </div>
      <div>
        <dt class="text-ink-500 text-xs">Tipo de problema</dt>
        <dd class="text-ink-900">{ticketProblemTypeLabel(ticket.problemType)}</dd>
      </div>
      <div>
        <dt class="text-ink-500 text-xs">Aberto em</dt>
        <dd class="text-ink-900">{formatDateTime(ticket.createdAt)}</dd>
      </div>
      <div class="sm:col-span-2">
        <dt class="text-ink-500 text-xs">Descrição</dt>
        <dd class="text-ink-900 whitespace-pre-line">{ticket.description}</dd>
      </div>

      {#if ticket.screenshotUrl}
        <div class="sm:col-span-2">
          <a
            class="text-primary text-sm font-semibold underline"
            href={ticket.screenshotUrl}
            target="_blank"
            rel="noopener"
          >
            Abrir o print enviado
          </a>
        </div>
      {/if}
    </dl>
  {/if}
</section>
