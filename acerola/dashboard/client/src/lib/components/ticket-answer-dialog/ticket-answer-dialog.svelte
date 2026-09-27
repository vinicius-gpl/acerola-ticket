<script lang="ts" module>
  import {
    ticketDepartmentLabel,
    ticketProblemTypeLabel,
  } from '@template/shared/domain/ticket-catalog.util';
  import {
    TICKET_PRIORITIES,
    TICKET_PRIORITY_LABELS,
    TICKET_STATUS_LABELS,
    TICKET_STATUSES,
    ticketStatusTone,
  } from '@template/shared/domain/ticket-status.util';
  import { type Ticket } from '@template/shared/schemas/ticket.schema';
  import { type FormFieldState } from '$lib/types/form-field.type';

  export type TicketAnswerField = 'status' | 'priority' | 'assignee' | 'solution';

  /**
   * O atendimento de um chamado, num modal.
   *
   * Função pura de props: o valor e o erro de cada campo chegam prontos (`FormFieldState`), e
   * por isso o modal abre no Storybook preenchido, com erro ou enviando — sem servidor e sem
   * biblioteca de formulário no meio.
   *
   * O que a pessoa escreveu fica VISÍVEL e não editável: quem atende precisa ler o pedido
   * enquanto responde, mas corrigir o texto de outra pessoa apagaria o que ela de fato disse.
   *
   * A recusa do servidor aparece DENTRO do modal, e ele continua aberto: fechar jogaria fora
   * o que foi digitado.
   */
  export type TicketAnswerDialogProps = {
    data: {
      ticket: Ticket;
      fields: Record<TicketAnswerField, FormFieldState>;
      /** Pronto e já com o texto. Nulo quando a pessoa não pediu para ser avisada. */
      whatsAppLink: string | null;
    };
    state: { isOpen: boolean; isSubmitting?: boolean; error?: string | null };
    actions: {
      onChange: (field: TicketAnswerField, value: string) => void;
      onBlur: (field: TicketAnswerField) => void;
      onSubmit: () => void;
      onClose: () => void;
    };
  };

  const STATUS_OPTIONS = TICKET_STATUSES.map((status) => ({
    value: status,
    label: TICKET_STATUS_LABELS[status],
  }));

  const PRIORITY_OPTIONS = TICKET_PRIORITIES.map((priority) => ({
    value: priority,
    label: TICKET_PRIORITY_LABELS[priority],
  }));
</script>

<script lang="ts">
  import { SOLUTION_MAX_LENGTH } from '@template/shared/schemas/ticket.schema';

  import Building2 from '@lucide/svelte/icons/building-2';
  import ImageIcon from '@lucide/svelte/icons/image';
  import MessageCircle from '@lucide/svelte/icons/message-circle';
  import MonitorSmartphone from '@lucide/svelte/icons/monitor-smartphone';
  import Phone from '@lucide/svelte/icons/phone';
  import Wrench from '@lucide/svelte/icons/wrench';

  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/ui/dialog';
  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import ErrorState from '$lib/components/error-state/error-state.svelte';
  import SelectField from '$lib/components/select-field/select-field.svelte';
  import StatusBadge from '$lib/components/status-badge/status-badge.svelte';
  import SubmitButton from '$lib/components/submit-button/submit-button.svelte';
  import TextAreaField from '$lib/components/text-area-field/text-area-field.svelte';
  import TextField from '$lib/components/text-field/text-field.svelte';

  let { data, state, actions }: TicketAnswerDialogProps = $props();

  const ticket = $derived(data.ticket);
  const fields = $derived(data.fields);

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSubmit();
  }

  function formatDateTime(value: string): string {
    return new Date(value).toLocaleString('pt-BR');
  }
</script>

<Dialog
  open={state.isOpen}
  onOpenChange={(isOpen: boolean) => (isOpen ? undefined : actions.onClose())}
>
  <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
    <form novalidate class="flex flex-col gap-4" onsubmit={handleSubmit}>
      <DialogHeader>
        <div class="flex flex-wrap items-center gap-2">
          <DialogTitle>Chamado {ticket.protocol}</DialogTitle>
          <StatusBadge
            data={{ label: TICKET_STATUS_LABELS[fields.status.value as Ticket['status']] }}
            ui={{ tone: ticketStatusTone(fields.status.value as Ticket['status']), size: 'sm' }}
          />
        </div>
        <DialogDescription>
          Aberto por {ticket.requesterName} em {formatDateTime(ticket.createdAt)}.
        </DialogDescription>
      </DialogHeader>

      <!-- O pedido, como a pessoa escreveu. Só leitura, de propósito. -->
      <section class="bg-muted flex flex-col gap-3 rounded-lg border p-3 text-sm">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="flex items-start gap-1.5">
            <Building2 class="text-ink-500 mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div class="min-w-0">
              <p class="text-ink-500 text-[10px] font-semibold tracking-wide uppercase">Departamento</p>
              <p class="text-ink-900 truncate font-medium">{ticketDepartmentLabel(ticket.department)}</p>
            </div>
          </div>
          <div class="flex items-start gap-1.5">
            <Wrench class="text-ink-500 mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div class="min-w-0">
              <p class="text-ink-500 text-[10px] font-semibold tracking-wide uppercase">Tipo</p>
              <p class="text-ink-900 truncate font-medium">{ticketProblemTypeLabel(ticket.problemType)}</p>
            </div>
          </div>
          <div class="flex items-start gap-1.5">
            <MonitorSmartphone class="text-ink-500 mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div class="min-w-0">
              <p class="text-ink-500 text-[10px] font-semibold tracking-wide uppercase">AnyDesk</p>
              <p class="text-ink-900 truncate font-medium">{ticket.anydeskId ?? 'Não informado'}</p>
            </div>
          </div>
          <div class="flex items-start gap-1.5">
            <Phone class="text-ink-500 mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div class="min-w-0">
              <p class="text-ink-500 text-[10px] font-semibold tracking-wide uppercase">WhatsApp</p>
              <p class="text-ink-900 truncate font-medium">{ticket.contactPhone ?? 'Não informado'}</p>
            </div>
          </div>
        </div>

        <p class="text-ink-900 border-border whitespace-pre-line border-t pt-3">{ticket.description}</p>

        {#if ticket.screenshotUrl}
          <a
            class="text-primary inline-flex w-fit items-center gap-1.5 text-sm font-semibold underline"
            href={ticket.screenshotUrl}
            target="_blank"
            rel="noopener"
          >
            <ImageIcon class="size-4" aria-hidden="true" />
            Abrir o print enviado
          </a>
        {/if}
      </section>

      <div class="flex flex-col gap-3">
        <h3 class="text-ink-900 text-sm font-semibold">Atendimento</h3>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5">
            <span class="text-ink-700 text-sm font-medium">Situação</span>
            <SelectField
              data={{ value: fields.status.value, options: STATUS_OPTIONS }}
              ui={{ ariaLabel: 'Situação' }}
              state={{ isDisabled: state.isSubmitting }}
              actions={{ onChange: (value: string) => actions.onChange('status', value) }}
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <span class="text-ink-700 text-sm font-medium">Urgência</span>
            <SelectField
              data={{ value: fields.priority.value, options: PRIORITY_OPTIONS }}
              ui={{ ariaLabel: 'Urgência' }}
              state={{ isDisabled: state.isSubmitting }}
              actions={{ onChange: (value: string) => actions.onChange('priority', value) }}
            />
          </div>
        </div>

        <TextField
          data={{
            label: 'Quem está atendendo',
            name: 'assignee',
            value: fields.assignee.value,
            placeholder: 'Nome de quem assumiu',
          }}
          state={{ error: fields.assignee.error, isDisabled: state.isSubmitting }}
          actions={{
            onChange: (value: string) => actions.onChange('assignee', value),
            onBlur: () => actions.onBlur('assignee'),
          }}
        />

        <TextAreaField
          data={{
            label: 'O que foi feito',
            name: 'solution',
            value: fields.solution.value,
            placeholder: 'Descreva a solução, para o próximo atendimento aproveitar',
            maxLength: SOLUTION_MAX_LENGTH,
          }}
          state={{ error: fields.solution.error, isDisabled: state.isSubmitting }}
          actions={{
            onChange: (value: string) => actions.onChange('solution', value),
            onBlur: () => actions.onBlur('solution'),
          }}
        />

        <!-- O botão só existe quando a pessoa PEDIU para ser avisada: ter o telefone dela no
             chamado não é autorização para usá-lo. -->
        {#if data.whatsAppLink}
          <a
            class="inline-flex w-fit items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            href={data.whatsAppLink}
            target="_blank"
            rel="noopener"
          >
            <MessageCircle class="size-4" aria-hidden="true" />
            Avisar no WhatsApp
          </a>
        {/if}
      </div>

      {#if state.error}
        <ErrorState data={{ message: state.error }} ui={{ variant: 'inline' }} />
      {/if}

      <DialogFooter>
        <ActionButton
          data={{ label: 'Fechar' }}
          ui={{ variant: 'secondary' }}
          state={{ isDisabled: state.isSubmitting }}
          actions={{ onClick: actions.onClose }}
        />
        <SubmitButton
          data={{ label: 'Salvar atendimento', loadingLabel: 'Salvando…' }}
          ui={{ className: 'sm:w-auto' }}
          state={{ isLoading: state.isSubmitting }}
        />
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
