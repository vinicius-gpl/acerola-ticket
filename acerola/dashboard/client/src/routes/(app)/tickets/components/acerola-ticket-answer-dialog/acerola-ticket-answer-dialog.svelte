<script lang="ts" module>
  import { type TicketAttachment } from '@template/shared/schemas/ticket-attachment.schema';
  import {
    ticketAreaLabel,
    ticketAreaOptions,
    ticketDepartmentLabel,
    ticketProblemTypeLabel,
    ticketProblemTypeOptionsForArea,
    type TicketArea,
  } from '@template/shared/domain/ticket-catalog.util';
  import {
    TICKET_PRIORITIES,
    TICKET_PRIORITY_LABELS,
    TICKET_STATUS_LABELS,
    TICKET_STATUSES,
    ticketPriorityTone,
    ticketStatusTone,
  } from '@template/shared/domain/ticket-status.util';
  import { type Ticket } from '@template/shared/schemas/ticket.schema';
  import { type FormFieldState } from '$lib/types/form-field.type';

  export type TicketAnswerField =
    | 'status'
    | 'priority'
    | 'area'
    | 'problemType'
    | 'computerId'
    | 'assignee'
    | 'solution';

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
  export type AcerolaTicketAnswerDialogProps = {
    data: {
      ticket: Ticket;
      fields: Record<TicketAnswerField, FormFieldState>;
      /** Pronto e já com o texto. Nulo quando a pessoa não pediu para ser avisada. */
      whatsAppLink: string | null;
      /** As máquinas do inventário, para vincular o chamado a uma delas. */
      machines: { value: string; label: string }[];
      attachments: TicketAttachment[];
      chosenFiles: File[];
      /** As áreas que ainda podem entrar como participante — todas, menos as que já são. */
      availableParticipantAreas: { value: TicketArea; label: string }[];
      chosenParticipantArea: TicketArea | '';
    };
    state: {
      isOpen: boolean;
      isSubmitting?: boolean;
      error?: string | null;
      isAttachmentsLoading?: boolean;
      isAttaching?: boolean;
      removingAttachmentId?: number | null;
      attachmentError?: string | null;
      isAddingArea?: boolean;
      removingAreaArea?: TicketArea | null;
      areaError?: string | null;
    };
    actions: {
      onChange: (field: TicketAnswerField, value: string) => void;
      onBlur: (field: TicketAnswerField) => void;
      onSubmit: () => void;
      onClose: () => void;
      onChosenFilesChange: (files: File[]) => void;
      onAttachmentError: (message: string | null) => void;
      onAttach: () => void;
      onRemoveAttachment: (attachment: TicketAttachment) => void;
      onChosenParticipantAreaChange: (area: TicketArea | '') => void;
      onAddParticipantArea: () => void;
      onRemoveParticipantArea: (area: TicketArea) => void;
    };
  };

  const STATUS_OPTIONS = TICKET_STATUSES.map((status) => ({
    value: status,
    label: TICKET_STATUS_LABELS[status],
    tone: ticketStatusTone(status),
  }));

  const AREA_OPTIONS = ticketAreaOptions();

  const PRIORITY_OPTIONS = TICKET_PRIORITIES.map((priority) => ({
    value: priority,
    label: TICKET_PRIORITY_LABELS[priority],
    tone: ticketPriorityTone(priority),
  }));
</script>

<script lang="ts">
  import { SOLUTION_MAX_LENGTH } from '@template/shared/schemas/ticket.schema';

  import Building2 from '@lucide/svelte/icons/building-2';
  import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
  import ImageIcon from '@lucide/svelte/icons/image';
  import ListChecks from '@lucide/svelte/icons/list-checks';
  import MessageCircle from '@lucide/svelte/icons/message-circle';
  import MonitorSmartphone from '@lucide/svelte/icons/monitor-smartphone';
  import Paperclip from '@lucide/svelte/icons/paperclip';
  import Phone from '@lucide/svelte/icons/phone';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import UserCog from '@lucide/svelte/icons/user-cog';
  import Wrench from '@lucide/svelte/icons/wrench';
  import XIcon from '@lucide/svelte/icons/x';

  import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from '$lib/components/acerola-dialog/acerola-dialog';
  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import OptionPicker from '$lib/components/acerola-option-picker/acerola-option-picker.svelte';
  import SelectField from '$lib/components/acerola-select-field/acerola-select-field.svelte';
  import StatusBadge from '$lib/components/acerola-status-badge/acerola-status-badge.svelte';
  import { onlyFrom } from '@template/shared/domain/attachment-ownership.util';

  import AttachmentList from '$lib/components/acerola-attachment-list/acerola-attachment-list.svelte';
  import AttachmentPicker from '$lib/components/acerola-attachment-picker/acerola-attachment-picker.svelte';
  import SubmitButton from '$lib/components/acerola-submit-button/acerola-submit-button.svelte';
  import TextAreaField from '$lib/components/acerola-text-area-field/acerola-text-area-field.svelte';
  import TextField from '$lib/components/acerola-text-field/acerola-text-field.svelte';
  import Timeline from '$lib/components/acerola-timeline/acerola-timeline.svelte';
  import TimelineStep from '$lib/components/acerola-timeline-step/acerola-timeline-step.svelte';

  let { data, state, actions }: AcerolaTicketAnswerDialogProps = $props();

  /* "Nenhuma" precisa ser uma opção de verdade: é assim que se desfaz um vínculo errado. O
     valor vazio é o que o view-model traduz de volta para nulo ao salvar. */
  const machineOptions = $derived([{ value: '', label: 'Nenhuma' }, ...data.machines]);

  const ticket = $derived(data.ticket);
  const fields = $derived(data.fields);

  /* As opções de tipo de problema dependem da ÁREA escolhida — Manutenção não tem
     "ar-condicionado" na lista de Infra, nem Infra tem "rede caiu" na de Manutenção. */
  const problemTypeOptions = $derived(
    ticketProblemTypeOptionsForArea(fields.area.value as TicketArea),
  );

  /**
   * OS DOIS CONJUNTOS DE ARQUIVO, separados na tela como são no contrato.
   *
   * A prova de quem pediu socorro fica junto do pedido dela, lá em cima, só de leitura. A
   * devolutiva do TI fica dentro do passo de diagnóstico, que é onde ela é produzida — e é
   * ali que o botão de anexar e o de excluir existem.
   */
  const requesterFiles = $derived(onlyFrom(data.attachments, 'requester'));
  const supportFiles = $derived(onlyFrom(data.attachments, 'support'));

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
  <!-- O card NÃO rola inteiro: ele é uma coluna de altura limitada, e só o MIOLO rola. Com o
       card inteiro rolando, o título e os botões subiam junto e sumiam num chamado com muito
       conteúdo — e no celular, onde a altura é pouca, sumiam quase sempre. `min-h-0` é o que
       permite o miolo encolher dentro da coluna; sem ele o flex ignora o limite de altura. -->
  <DialogContent
    class="flex max-h-[92vh] flex-col gap-0 overflow-hidden rounded-surface border border-border bg-card p-0 shadow-xl sm:max-w-2xl"
  >
    <form novalidate class="flex min-h-0 flex-1 flex-col" onsubmit={handleSubmit}>
      <DialogHeader class="shrink-0 border-b border-border/80 px-6 pt-6 pb-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <DialogTitle class="font-mono text-base font-bold text-foreground">Chamado {ticket.protocol}</DialogTitle>
            <StatusBadge
              data={{ label: TICKET_STATUS_LABELS[fields.status.value as Ticket['status']] }}
              ui={{ tone: ticketStatusTone(fields.status.value as Ticket['status']), size: 'sm' }}
            />
          </div>
          <span class="text-xs text-muted-foreground">
            {formatDateTime(ticket.createdAt)}
          </span>
        </div>
        <DialogDescription class="mt-1 text-xs text-muted-foreground">
          Aberto por <strong class="font-medium text-foreground">{ticket.requesterName}</strong>
        </DialogDescription>
      </DialogHeader>

      <div class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
      <!-- O pedido, como a pessoa escreveu. Estilo Approvals Queue / Drawer de Diagnóstico. -->
      <section class="rounded-surface border border-border/80 bg-ink-100/60 p-4.5 flex flex-col gap-3.5 shadow-xs">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="flex items-start gap-2">
            <span class="flex size-7 shrink-0 items-center justify-center rounded-chip bg-ink-100/60 text-ink-700">
              <Building2 class="size-3.5" aria-hidden="true" />
            </span>
            <div class="min-w-0">
              <p class="text-xs font-semibold tracking-wider uppercase text-ink-500">Departamento</p>
              <p class="break-words text-xs font-medium text-foreground">{ticketDepartmentLabel(ticket.department)}</p>
            </div>
          </div>

          <div class="flex items-start gap-2">
            <span class="flex size-7 shrink-0 items-center justify-center rounded-chip bg-ink-100/60 text-ink-700">
              <Wrench class="size-3.5" aria-hidden="true" />
            </span>
            <div class="min-w-0">
              <p class="text-xs font-semibold tracking-wider uppercase text-ink-500">Tipo</p>
              <p class="break-words text-xs font-medium text-foreground">{ticketProblemTypeLabel(ticket.problemType)}</p>
            </div>
          </div>

          <div class="flex items-start gap-2">
            <span class="flex size-7 shrink-0 items-center justify-center rounded-chip bg-ink-100/60 text-ink-700">
              <MonitorSmartphone class="size-3.5" aria-hidden="true" />
            </span>
            <div class="min-w-0">
              <p class="text-xs font-semibold tracking-wider uppercase text-ink-500">AnyDesk</p>
              <p class="break-words text-xs font-medium text-foreground font-mono">{ticket.anydeskId ?? 'Não informado'}</p>
            </div>
          </div>

          <div class="flex items-start gap-2">
            <span class="flex size-7 shrink-0 items-center justify-center rounded-chip bg-ink-100/60 text-ink-700">
              <Phone class="size-3.5" aria-hidden="true" />
            </span>
            <div class="min-w-0">
              <p class="text-xs font-semibold tracking-wider uppercase text-ink-500">WhatsApp</p>
              <p class="break-words text-xs font-medium text-foreground">{ticket.contactPhone ?? 'Não informado'}</p>
            </div>
          </div>
        </div>

        <!-- Descrição em bloco de citação diagnóstica -->
        <div class="rounded-box border border-border/80 bg-card p-3.5 text-xs leading-relaxed text-foreground shadow-xs">
          <p class="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">Descrição do problema</p>
          <p class="whitespace-pre-line text-sm text-foreground/90">{ticket.description}</p>
        </div>

        {#if ticket.screenshotUrl}
          <a
            class="control-sm inline-flex w-fit items-center gap-1.5 rounded-control border border-border bg-card text-xs font-semibold text-primary hover:bg-ink-100 transition-colors shadow-xs"
            href={ticket.screenshotUrl}
            target="_blank"
            rel="noopener"
          >
            <ImageIcon class="size-3.5" aria-hidden="true" />
            Abrir o print enviado
          </a>
        {/if}
      </section>

      <!-- O QUE A PESSOA MANDOU — só de leitura, e fica JUNTO do pedido dela, em cima.
           Não há botão de excluir aqui, e não é esquecimento: é a prova de quem pediu
           socorro. Apagar o print de alguém e depois dizer "não recebi print nenhum" é uma
           história que o sistema não deixa acontecer (ver `attachment-ownership.util`). -->
      <section class="flex flex-col gap-2">
        <div class="border-b border-border/80 pb-2">
          <h3 class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            O que a pessoa enviou
          </h3>
        </div>

        <AttachmentList
          data={{ attachments: requesterFiles }}
          ui={{ emptyLabel: 'Quem abriu o chamado não anexou nenhum arquivo.', actor: 'support' }}
          state={{ isLoading: state.isAttachmentsLoading }}
        />
      </section>

      <div class="flex flex-col gap-1">
        <div class="border-b border-border/80 pb-2">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Atualização do Atendimento</h3>
        </div>

        <Timeline ui={{ className: 'pt-4' }}>
          <TimelineStep data={{ title: 'Quem assume o chamado', icon: UserCog }} ui={{ tone: 'brand' }}>
            <TextField
              data={{
                label: 'Quem está atendendo',
                name: 'assignee',
                value: fields.assignee.value,
                placeholder: 'Ex: Suporte TI',
              }}
              state={{ error: fields.assignee.error, isDisabled: state.isSubmitting }}
              actions={{
                onChange: (value: string) => actions.onChange('assignee', value),
                onBlur: () => actions.onBlur('assignee'),
              }}
            />
          </TimelineStep>

          <TimelineStep
            data={{
              title: 'Situação e urgência',
              description: 'Isso aparece pra quem abriu o chamado.',
              icon: ListChecks,
            }}
          >
            <!-- `min-w-0` na linha inteira: sem ele, um campo de conteúdo largo (o nome de uma
                 máquina, por exemplo) empurra a linha para além do diálogo em vez de encolher,
                 e a tela ganha barra de rolagem horizontal. -->
            <div class="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-6">
              <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-muted-foreground">Situação</span>
                <OptionPicker
                  data={{ value: fields.status.value, options: STATUS_OPTIONS }}
                  ui={{ ariaLabel: 'Situação', fullWidth: true }}
                  state={{ isDisabled: state.isSubmitting }}
                  actions={{ onChange: (value: string) => actions.onChange('status', value) }}
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-muted-foreground">Urgência</span>
                <OptionPicker
                  data={{ value: fields.priority.value, options: PRIORITY_OPTIONS }}
                  ui={{ ariaLabel: 'Urgência', fullWidth: true }}
                  state={{ isDisabled: state.isSubmitting }}
                  actions={{ onChange: (value: string) => actions.onChange('priority', value) }}
                />
              </div>

              <!-- A área (#13): quem abre escolhe pelo que parece; quem atende descobre que
                   era de outra. Trocar aqui PODE ser recusado pelo servidor — só quem
                   gerencia alguma área do chamado reclassifica (ver `TicketsService.update`). -->
              <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-muted-foreground">Área</span>
                <OptionPicker
                  data={{ value: fields.area.value, options: AREA_OPTIONS }}
                  ui={{ ariaLabel: 'Área', fullWidth: true }}
                  state={{ isDisabled: state.isSubmitting }}
                  actions={{
                    onChange: (value: string) => {
                      actions.onChange('area', value);
                      /* Trocar de área pode deixar o tipo de problema atual fora da lista
                         nova — "ar-condicionado" não existe em Infra. O primeiro tipo da
                         área nova é sempre um valor válido, e evita mandar um tipo órfão. */
                      const firstOfArea = ticketProblemTypeOptionsForArea(value as TicketArea)[0];
                      if (firstOfArea) actions.onChange('problemType', firstOfArea.value);
                    },
                  }}
                />
              </div>

              <!-- Quem abre o chamado escolhe o tipo pelo que parece; quem atende descobre o
                   que era. Sem esta correção, o mapa de "o que mais dá problema" soma o
                   palpite de quem pediu socorro, e não o diagnóstico. -->
              <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-muted-foreground">Tipo do problema</span>
                <SelectField
                  data={{ value: fields.problemType.value, options: problemTypeOptions }}
                  ui={{ ariaLabel: 'Tipo do problema', className: 'sm:min-w-[180px]' }}
                  state={{ isDisabled: state.isSubmitting }}
                  actions={{ onChange: (value: string) => actions.onChange('problemType', value) }}
                />
              </div>

              <!-- A máquina é preenchida AQUI, e não no formulário público: quem pede socorro
                   não sabe por qual nome o sistema conhece o computador dele. É este vínculo
                   que faz a ficha da máquina saber quantos problemas ela já deu. -->
              <div class="flex min-w-0 flex-col gap-1.5 sm:flex-1 sm:basis-[240px]">
                <span class="text-xs font-medium text-muted-foreground">Máquina</span>
                <!-- `OptionPicker`, e não `SelectField`: este é o ÚNICO campo do sistema que
                     escolhe entre o parque inteiro. Numa lista rolante de cinquenta máquinas,
                     achar "a da recepção" é rolar e ler linha por linha; aqui a pessoa digita
                     "recep" e sobra uma. O `OptionPicker` vira busca sozinho quando passa de
                     seis opções, e continua pastilha onde há poucas. -->
                <OptionPicker
                  data={{ value: fields.computerId.value, options: machineOptions }}
                  ui={{ ariaLabel: 'Máquina', placeholder: 'Nenhuma', fullWidth: true }}
                  state={{ isDisabled: state.isSubmitting }}
                  actions={{ onChange: (value: string) => actions.onChange('computerId', value) }}
                />
              </div>
            </div>

            <!-- ÁREAS PARTICIPANTES (#13) — além da área original, de cima. Ex.: um chamado
                 de Infra que também precisa de Manutenção. Mudança própria, fora do envio do
                 formulário: soma/remove na hora, sem esperar o resto ser salvo. -->
            <div class="mt-4 flex flex-col gap-1.5 border-t border-border/70 pt-4">
              <span class="text-xs font-medium text-muted-foreground">Áreas participantes</span>

              {#if data.ticket.participantAreas.length === 0}
                <p class="text-xs text-muted-foreground/70">Nenhuma área participante ainda.</p>
              {:else}
                <div class="flex flex-wrap items-center gap-1.5">
                  {#each data.ticket.participantAreas as area (area)}
                    <span class="inline-flex items-center gap-1 rounded-chip bg-ink-100 pl-2.5 pr-1 py-1">
                      <StatusBadge data={{ label: ticketAreaLabel(area) }} ui={{ tone: 'brand', size: 'sm' }} />
                      <button
                        type="button"
                        onclick={() => actions.onRemoveParticipantArea(area)}
                        disabled={state.removingAreaArea === area}
                        aria-label={`Remover ${ticketAreaLabel(area)} do chamado`}
                        class="text-muted-foreground hover:text-destructive flex size-5 items-center justify-center rounded-full transition-colors"
                      >
                        <XIcon class="size-3" aria-hidden="true" />
                      </button>
                    </span>
                  {/each}
                </div>
              {/if}

              {#if data.availableParticipantAreas.length > 0}
                <div class="mt-1 flex items-center gap-2">
                  <OptionPicker
                    data={{ value: data.chosenParticipantArea, options: data.availableParticipantAreas }}
                    ui={{ ariaLabel: 'Somar área participante', placeholder: 'Escolher área' }}
                    state={{ isDisabled: state.isAddingArea }}
                    actions={{
                      onChange: (value: string) =>
                        actions.onChosenParticipantAreaChange(value as typeof data.chosenParticipantArea),
                    }}
                  />
                  <ActionButton
                    data={{ label: 'Somar', loadingLabel: 'Somando…' }}
                    ui={{ variant: 'secondary', size: 'sm', icon: PlusIcon }}
                    state={{
                      isDisabled: data.chosenParticipantArea === '',
                      isLoading: state.isAddingArea,
                    }}
                    actions={{ onClick: actions.onAddParticipantArea }}
                  />
                </div>
              {/if}

              {#if state.areaError}
                <p class="text-destructive text-xs">{state.areaError}</p>
              {/if}
            </div>
          </TimelineStep>

          <TimelineStep
            data={{ title: 'Diagnóstico e solução', icon: ClipboardCheck }}
            ui={{ isLast: true, tone: 'success' }}
          >
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

            <!-- OS ARQUIVOS DA DEVOLUTIVA, aqui dentro e não lá em cima: eles são parte do
                 que foi feito — a nota fiscal da peça trocada, a foto do antes e do depois.
                 Ficam do lado do TI, e só o TI os apaga; quem abriu o chamado vê e baixa. -->
            <div class="border-border/60 flex flex-col gap-2 rounded-box border p-3">
              <p class="text-muted-foreground text-xs font-medium">
                Arquivos desta devolutiva
                <span class="text-muted-foreground/70 font-normal">
                  — quem abriu o chamado vê e baixa, mas não apaga
                </span>
              </p>

              <AttachmentList
                data={{ attachments: supportFiles }}
                ui={{ emptyLabel: 'Você ainda não anexou nada a esta devolutiva.', actor: 'support' }}
                state={{
                  isLoading: state.isAttachmentsLoading,
                  removingId: state.removingAttachmentId,
                  error: state.attachmentError,
                }}
                actions={{ onRemove: actions.onRemoveAttachment }}
              />

              <!-- A cota é POR LADO: o que a pessoa mandou não ocupa o espaço do TI. Por isso
                   só os arquivos do TI entram na conta do que ainda cabe. -->
              <AttachmentPicker
                data={{
                  files: data.chosenFiles,
                  existingKinds: supportFiles.map((attachment) => attachment.kind),
                }}
                state={{ isDisabled: state.isAttaching, error: state.attachmentError }}
                actions={{
                  onChange: actions.onChosenFilesChange,
                  onError: actions.onAttachmentError,
                }}
              />

              {#if data.chosenFiles.length > 0}
                <!-- Os arquivos entram num envio à parte do formulário: quem está atendendo
                     pode juntar a nota fiscal sem ter de salvar a situação do chamado junto.

                     Por isso ele é COLORIDO (`primary`), e não mais um botão de borda: quem
                     escolheu os arquivos acha que já anexou, e o passo que falta precisa se
                     parecer com um passo que falta. Em cinza, ele some no meio do bloco e a
                     pessoa fecha o diálogo achando que mandou. -->
                <ActionButton
                  data={{
                    label: `Anexar ${data.chosenFiles.length} arquivo(s) à devolutiva`,
                    loadingLabel: 'Anexando…',
                  }}
                  ui={{ variant: 'primary', size: 'sm', icon: Paperclip, className: 'w-fit' }}
                  state={{ isLoading: state.isAttaching }}
                  actions={{ onClick: actions.onAttach }}
                />
              {/if}
            </div>

            {#if data.whatsAppLink}
              <a
                class="control-sm inline-flex w-fit items-center gap-2 rounded-control border border-success/20 bg-success/10 text-xs font-semibold text-success transition-all hover:bg-success/20"
                href={data.whatsAppLink}
                target="_blank"
                rel="noopener"
              >
                <MessageCircle class="size-4" aria-hidden="true" />
                Avisar no WhatsApp
              </a>
            {/if}
          </TimelineStep>
        </Timeline>
      </div>

      {#if state.error}
        <ErrorState data={{ message: state.error }} ui={{ variant: 'inline' }} />
      {/if}
      </div>

      <DialogFooter class="shrink-0 border-t border-border/80 px-6 py-4">
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
