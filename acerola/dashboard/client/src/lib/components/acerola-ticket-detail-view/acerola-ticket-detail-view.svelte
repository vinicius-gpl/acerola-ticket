<script lang="ts" module>
  import type { Snippet } from 'svelte';

  import {
    ticketAreaLabel,
    ticketDepartmentLabel,
    ticketProblemTypeLabel,
  } from '@template/shared/domain/ticket-catalog.util';
  import {
    isClosedTicketStatus,
    ticketPriorityLabel,
    ticketPriorityTone,
    ticketStatusLabel,
    ticketStatusTone,
  } from '@template/shared/domain/ticket-status.util';
  import { type TicketAttachment } from '@template/shared/schemas/ticket-attachment.schema';
  import { type TicketHistory } from '@template/shared/schemas/ticket-history.schema';
  import { type Ticket } from '@template/shared/schemas/ticket.schema';

  /**
   * A FICHA DE UM CHAMADO — a ordem de serviço: o pedido, a linha do tempo e os dados.
   *
   * Função pura de props: não busca nada e não navega. Os dois formulários (lançar histórico e
   * corrigir dados) entram por `snippet`: cada um tem o próprio view-model, que nasce e morre
   * com o chamado, e a ficha só reserva o lugar deles na tela.
   *
   * É uma PÁGINA, e não um diálogo sobre a fila, porque o chamado tem endereço próprio: dá para
   * colar `/tickets/7` numa conversa e dizer "é deste que estou falando" — e porque uma linha
   * do tempo que cresce não cabe numa janela que tem de caber na tela.
   *
   * A ordem da tela é a de quem atende: primeiro o que foi pedido, depois o que já aconteceu,
   * e por último o que vai acontecer agora (o novo histórico, no fim da linha do tempo).
   */
  export type AcerolaTicketDetailViewProps = {
    data: {
      ticket: Ticket;
      /** A linha do tempo, do mais antigo para o mais novo. */
      histories: TicketHistory[];
      /** Os arquivos do PRÓPRIO chamado — os de cada histórico vão dentro dele. */
      attachments: TicketAttachment[];
      /** Pronto e já com o texto. Nulo quando a pessoa não pediu para ser avisada. */
      whatsAppLink: string | null;
    };
    state?: {
      isTimelineLoading?: boolean;
      timelineError?: string | null;
      isAttachmentsLoading?: boolean;
      removingAttachmentId?: number | null;
      attachmentError?: string | null;
      isDownloadingServiceOrder?: boolean;
      serviceOrderError?: string | null;
    };
    actions: {
      onBack: () => void;
      onDownloadServiceOrder: () => void;
      onRemoveAttachment: (attachment: TicketAttachment) => void;
    };
    /** O formulário de novo histórico. */
    historyForm: Snippet;
    /** O formulário de correção dos dados. */
    dataForm: Snippet;
  };

  /** A soma do tempo informado nos históricos. Nulo quando ninguém informou tempo nenhum. */
  export function totalMinutesOf(histories: readonly TicketHistory[]): number | null {
    const informed = histories
      .map((history) => history.minutesSpent)
      .filter((minutes) => minutes !== null);
    if (informed.length === 0) return null;

    return informed.reduce((sum, minutes) => sum + minutes, 0);
  }
</script>

<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import FileDown from '@lucide/svelte/icons/file-down';
  import GitPullRequest from '@lucide/svelte/icons/git-pull-request';
  import ImageIcon from '@lucide/svelte/icons/image';
  import MessageCircle from '@lucide/svelte/icons/message-circle';

  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import AttachmentList from '$lib/components/acerola-attachment-list/acerola-attachment-list.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import HistoryTimeline, {
    formatMinutesSpent,
  } from '$lib/components/acerola-history-timeline/acerola-history-timeline.svelte';
  import PageHeader from '$lib/components/acerola-page-header/acerola-page-header.svelte';
  import PanelCard from '$lib/components/acerola-panel-card/acerola-panel-card.svelte';
  import StatusBadge from '$lib/components/acerola-status-badge/acerola-status-badge.svelte';

  let { data, state: viewState, actions, historyForm, dataForm }: AcerolaTicketDetailViewProps =
    $props();

  const ticket = $derived(data.ticket);
  const isClosed = $derived(isClosedTicketStatus(ticket.status));
  const totalMinutes = $derived(totalMinutesOf(data.histories));

  /** O que a pessoa informou ao abrir — só de leitura. */
  const requestFacts = $derived([
    { label: 'Quem abriu', value: ticket.requesterName },
    { label: 'Departamento', value: ticketDepartmentLabel(ticket.department) },
    { label: 'Área', value: ticketAreaLabel(ticket.area) },
    ...(ticket.projectName ? [{ label: 'Sistema', value: ticket.projectName }] : []),
    { label: 'Tipo', value: ticketProblemTypeLabel(ticket.problemType) },
    { label: 'WhatsApp', value: ticket.contactPhone ?? 'Não informado' },
    { label: 'AnyDesk', value: ticket.anydeskId ?? 'Não informado' },
  ]);

  /** Os carimbos do atendimento — todos saem da linha do tempo, nenhum é digitado. */
  const stamps = $derived([
    { label: 'Aberto em', value: formatDateTime(ticket.createdAt) },
    { label: 'Atendimento iniciado em', value: formatDateTime(ticket.startedAt) },
    { label: 'Resolvido em', value: formatDateTime(ticket.resolvedAt) },
    { label: 'Máquina', value: ticket.computerName ?? '—' },
    { label: 'Responsável', value: ticket.assignee ?? '—' },
    {
      label: 'Tempo registrado',
      value: totalMinutes === null ? '—' : formatMinutesSpent(totalMinutes),
    },
  ]);

  function formatDateTime(value: string | null): string {
    return value ? new Date(value).toLocaleString('pt-BR') : '—';
  }
</script>

<div class="mx-auto flex w-full max-w-7xl flex-col gap-5">
  <ActionButton
    data={{ label: 'Voltar aos chamados' }}
    ui={{ variant: 'ghost', size: 'sm', icon: ArrowLeft, className: 'self-start' }}
    actions={{ onClick: actions.onBack }}
  />

  <PageHeader
    data={{
      title: `Chamado ${ticket.protocol}`,
      description: `Aberto por ${ticket.requesterName} em ${formatDateTime(ticket.createdAt)}`,
    }}
  >
    {#if data.whatsAppLink}
      <a
        class="control-md rounded-control border-success/20 bg-success/10 text-success hover:bg-success/20 inline-flex items-center gap-2 border text-sm font-semibold transition-colors"
        href={data.whatsAppLink}
        target="_blank"
        rel="noopener"
      >
        <MessageCircle class="size-4" aria-hidden="true" />
        Avisar no WhatsApp
      </a>
    {/if}
    <ActionButton
      data={{ label: 'Ordem de serviço (PDF)', loadingLabel: 'Gerando…' }}
      ui={{ variant: 'secondary', icon: FileDown }}
      state={{ isLoading: viewState?.isDownloadingServiceOrder }}
      actions={{ onClick: actions.onDownloadServiceOrder }}
    />
  </PageHeader>

  <!-- O estágio fica logo abaixo do título, com a urgência: são as duas coisas que quem abre a
       ficha quer saber antes de ler qualquer outra. -->
  <div class="flex flex-wrap items-center gap-2">
    <StatusBadge
      data={{ label: ticketStatusLabel(ticket.status) }}
      ui={{ tone: ticketStatusTone(ticket.status) }}
    />
    <StatusBadge
      data={{ label: `Urgência ${ticketPriorityLabel(ticket.priority).toLowerCase()}` }}
      ui={{ tone: ticketPriorityTone(ticket.priority) }}
    />
    {#each ticket.participantAreas as area (area)}
      <StatusBadge data={{ label: `Também: ${ticketAreaLabel(area)}` }} ui={{ tone: 'brand' }} />
    {/each}
    {#if ticket.projectName}
      <StatusBadge data={{ label: `Sistema: ${ticket.projectName}` }} ui={{ tone: 'brand' }} />
    {/if}
    {#if ticket.githubIssueUrl}
      <a
        class="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/80"
        href={ticket.githubIssueUrl}
        target="_blank"
        rel="noopener"
      >
        <GitPullRequest class="size-3 text-primary" aria-hidden="true" />
        <span>Issue #{ticket.githubIssueNumber ?? ''}</span>
        <ExternalLink class="size-3 text-muted-foreground" aria-hidden="true" />
      </a>
    {/if}
  </div>

  {#if viewState?.serviceOrderError}
    <ErrorState data={{ message: viewState.serviceOrderError }} ui={{ variant: 'inline' }} />
  {/if}

  <div class="grid gap-5 lg:grid-cols-3">
    <div class="flex min-w-0 flex-col gap-5 lg:col-span-2">
      <!-- O PEDIDO, como a pessoa escreveu — só de leitura. Quem atende precisa ler o pedido
           enquanto responde, mas corrigir o texto de outra pessoa apagaria o que ela disse. -->
      <PanelCard data={{ title: 'O pedido' }} ui={{ bodyClassName: 'flex flex-col gap-4' }}>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          {#each requestFacts as fact (fact.label)}
            <div class="min-w-0">
              <dt class="text-muted-foreground text-xs">{fact.label}</dt>
              <dd class="text-foreground text-sm font-medium break-words">{fact.value}</dd>
            </div>
          {/each}
        </dl>

        <div class="rounded-box border-border/80 bg-muted/20 border p-3.5">
          <p class="text-muted-foreground mb-1 text-xs font-semibold tracking-wider uppercase">
            Descrição do problema
          </p>
          <p class="text-foreground/90 text-sm whitespace-pre-line">{ticket.description}</p>
        </div>

        {#if ticket.screenshotUrl}
          <a
            class="control-sm rounded-control border-border bg-card text-primary hover:bg-ink-100 inline-flex w-fit items-center gap-1.5 border text-xs font-semibold shadow-xs transition-colors"
            href={ticket.screenshotUrl}
            target="_blank"
            rel="noopener"
          >
            <ImageIcon class="size-3.5" aria-hidden="true" />
            Abrir o print enviado
          </a>
        {/if}

        <!-- OS ARQUIVOS DO CHAMADO. O que a pessoa mandou não tem botão de excluir, e não é
             esquecimento: é a prova de quem pediu socorro (ver `attachment-ownership.util`).
             Os arquivos de cada histórico aparecem dentro dele, na linha do tempo. -->
        <div class="flex flex-col gap-2">
          <p class="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Arquivos do chamado
          </p>
          <AttachmentList
            data={{ attachments: data.attachments }}
            ui={{ emptyLabel: 'Nenhum arquivo foi enviado com o chamado.', actor: 'support' }}
            state={{
              isLoading: viewState?.isAttachmentsLoading,
              removingId: viewState?.removingAttachmentId,
              error: viewState?.attachmentError,
            }}
            actions={{ onRemove: actions.onRemoveAttachment }}
          />
        </div>
      </PanelCard>

      <PanelCard
        data={{
          title: 'Linha do tempo',
          hint: 'Tudo o que aconteceu com este chamado, do mais antigo para o mais novo.',
        }}
      >
        <HistoryTimeline
          data={{ histories: data.histories }}
          state={{ isLoading: viewState?.isTimelineLoading, error: viewState?.timelineError }}
        />
      </PanelCard>

      <PanelCard
        data={{
          title: isClosed ? 'Reabrir o chamado' : 'Novo histórico',
          hint: isClosed
            ? 'Este chamado está encerrado. Para registrar algo novo, reabra-o.'
            : 'É o histórico que muda o estágio do chamado.',
        }}
      >
        {@render historyForm()}
      </PanelCard>
    </div>

    <div class="flex min-w-0 flex-col gap-5">
      <PanelCard data={{ title: 'Atendimento' }}>
        <dl class="flex flex-col gap-3">
          {#each stamps as stamp (stamp.label)}
            <div class="flex items-baseline justify-between gap-3">
              <dt class="text-muted-foreground text-xs">{stamp.label}</dt>
              <dd class="text-foreground text-right text-sm font-medium break-words">
                {stamp.value}
              </dd>
            </div>
          {/each}
        </dl>
      </PanelCard>

      <PanelCard
        data={{
          title: 'Dados do chamado',
          hint: 'O estágio não muda aqui — muda lançando um histórico.',
        }}
      >
        {@render dataForm()}
      </PanelCard>
    </div>
  </div>
</div>
