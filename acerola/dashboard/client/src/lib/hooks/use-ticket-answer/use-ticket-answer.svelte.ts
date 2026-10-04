import { createForm } from '@tanstack/svelte-form';
import { writable } from 'svelte/store';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { ticketAreaOptions, type TicketArea } from '@template/shared/domain/ticket-catalog.util';
import { buildWhatsAppLink } from '@template/shared/domain/ticket-whatsapp.util';
import { type TicketAttachment } from '@template/shared/schemas/ticket-attachment.schema';
import { ticketStatusLabel } from '@template/shared/domain/ticket-status.util';
import {
  type Ticket,
  ticketAnswerFormSchema,
  type TicketAnswerFormValues,
} from '@template/shared/schemas/ticket.schema';

import { readError } from '$lib/api/http-client';
import { computersApi } from '$lib/api/computers.api';
import { ticketsApi } from '$lib/api/tickets.api';
import { toFieldState } from '$lib/hooks/use-form-projection/use-form-projection.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { COMPUTERS_QUERY_KEY } from '$lib/hooks/use-computer-list/use-computer-list.svelte';
import { TICKETS_QUERY_KEY } from '$lib/hooks/use-ticket-list/use-ticket-list.svelte';

/** Uma página grande o bastante para caber o parque inteiro num campo de escolha. */
const MACHINE_OPTIONS_PAGE_SIZE = 200;
import { type FormFieldState } from '$lib/types/form-field.type';

export type TicketAnswerField =
  | 'status'
  | 'priority'
  | 'area'
  | 'problemType'
  | 'computerId'
  | 'assignee'
  | 'solution';

export type TicketAnswerModel = {
  data: {
    ticket: Ticket;
    fields: Record<TicketAnswerField, FormFieldState>;
    /** O link de aviso, pronto. Nulo quando a pessoa não pediu para ser avisada. */
    whatsAppLink: string | null;
    /** As máquinas do inventário, para vincular o chamado a uma delas. */
    machines: { value: string; label: string }[];
    /** Os arquivos já anexados ao chamado. */
    attachments: TicketAttachment[];
    /** Os escolhidos agora, ainda não enviados. */
    chosenFiles: File[];
    /** As áreas que ainda PODEM entrar como participante — todas, menos as que já estão. */
    availableParticipantAreas: { value: TicketArea; label: string }[];
    /** A área escolhida no seletor de "somar área", ainda não enviada. */
    chosenParticipantArea: TicketArea | '';
  };
  state: {
    isSubmitting: boolean;
    error: string | null;
    isAttachmentsLoading: boolean;
    isAttaching: boolean;
    /** Qual anexo está sendo excluído — trava a linha dele, não a lista. */
    removingAttachmentId: number | null;
    /** A recusa da escolha ou da gravação de anexo, separada da falha do formulário. */
    attachmentError: string | null;
    isAddingArea: boolean;
    /** Qual área participante está sendo removida — trava o chip dela, não a lista toda. */
    removingAreaArea: TicketArea | null;
    areaError: string | null;
  };
  actions: {
    onChange: (field: TicketAnswerField, value: string) => void;
    onBlur: (field: TicketAnswerField) => void;
    onSubmit: () => void;
    onChosenFilesChange: (files: File[]) => void;
    onAttachmentError: (message: string | null) => void;
    onAttach: () => void;
    onRemoveAttachment: (attachment: TicketAttachment) => void;
    onChosenParticipantAreaChange: (area: TicketArea | '') => void;
    onAddParticipantArea: () => void;
    onRemoveParticipantArea: (area: TicketArea) => void;
  };
};

/**
 * O atendimento de um chamado: assumir, mudar a situação e registrar o que foi feito.
 *
 * Só isso — nada que identifique quem abriu é editável. Corrigir o nome ou o telefone de um
 * chamado alheio apagaria o que a pessoa de fato escreveu, e o servidor também recusa.
 *
 * O formulário começa com os valores do chamado e NÃO acompanha mudanças dele depois de
 * aberto: a rota monta este model dentro de um `{#key}` pelo id. Sincronizar com efeito
 * apagaria o que quem atende estava digitando quando a lista recarregasse por trás.
 */
export function useTicketAnswerModel({
  ticket,
  attendantName,
  onSaved,
}: {
  ticket: Ticket;
  /** O nome de quem está logado: preenche "quem está atendendo" quando ninguém assumiu ainda. */
  attendantName?: string;
  onSaved: () => void;
}): TicketAnswerModel {
  const queryClient = useQueryClient();

  /** A chave da consulta de anexos DESTE chamado: anexar e excluir a refazem. */
  const attachmentsKey = [...TICKETS_QUERY_KEY, 'attachments', ticket.id];

  /* A MESMA chave do formulário de manutenção: as duas telas pedem a lista de máquinas para
     um campo de escolha, e uma chave só faz a segunda aproveitar o que a primeira buscou. */
  const machines = mirrorStore(
    createQuery(
      writable({
        queryKey: [...COMPUTERS_QUERY_KEY, 'options'],
        queryFn: () => computersApi.list({ page: 1, pageSize: MACHINE_OPTIONS_PAGE_SIZE }),
      }),
    ),
  );

  const attachments = mirrorStore(
    createQuery(
      writable({ queryKey: attachmentsKey, queryFn: () => ticketsApi.attachments(ticket.id) }),
    ),
  );

  /* Os escolhidos vivem só aqui, até alguém mandar guardar: antes disso eles não são do
     chamado, são da tela. */
  let chosenFiles = $state<File[]>([]);
  let attachmentError = $state<string | null>(null);
  let removingAttachmentId = $state<number | null>(null);

  const attach = mirrorStore(
    createMutation({
      mutationFn: (files: readonly File[]) => ticketsApi.attach(ticket.id, files),
      onSuccess: async () => {
        chosenFiles = [];
        attachmentError = null;
        await queryClient.invalidateQueries({ queryKey: attachmentsKey });
      },
    }),
  );

  const removeAttachment = mirrorStore(
    createMutation({
      mutationFn: (attachmentId: number) => ticketsApi.removeAttachment(ticket.id, attachmentId),
      onSettled: async () => {
        removingAttachmentId = null;
        await queryClient.invalidateQueries({ queryKey: attachmentsKey });
      },
    }),
  );

  const save = mirrorStore(
    createMutation({
      mutationFn: (values: TicketAnswerFormValues) => ticketsApi.update(ticket.id, toUpdateInput(values)),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
        onSaved();
      },
    }),
  );

  /* As áreas participantes (#13) são um pedido PRÓPRIO, fora do formulário principal: somar
     ou tirar uma área acontece na hora, sem esperar quem atende terminar de preencher o
     resto. `currentTicket` existe porque `ticket` (o parâmetro) é o estado de QUANDO o modal
     abriu — sem ele, somar uma área não apareceria até o modal reabrir. */
  let currentTicket = $state(ticket);
  let chosenParticipantArea = $state<TicketArea | ''>('');
  let removingAreaArea = $state<TicketArea | null>(null);
  let areaError = $state<string | null>(null);

  const addArea = mirrorStore(
    createMutation({
      mutationFn: (area: TicketArea) => ticketsApi.addArea(ticket.id, area),
      onSuccess: async (updated) => {
        currentTicket = updated;
        chosenParticipantArea = '';
        areaError = null;
        await queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
      },
      onError: (error: unknown) => {
        areaError = readError(error) ?? 'Não consegui adicionar a área.';
      },
    }),
  );

  const removeArea = mirrorStore(
    createMutation({
      mutationFn: (area: TicketArea) => ticketsApi.removeArea(ticket.id, area),
      onSuccess: async (updated) => {
        currentTicket = updated;
        areaError = null;
        await queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
      },
      onError: (error: unknown) => {
        areaError = readError(error) ?? 'Não consegui remover a área.';
      },
      onSettled: () => {
        removingAreaArea = null;
      },
    }),
  );

  const form = createForm(() => ({
    defaultValues: toFormValues(ticket, attendantName),
    /* As MESMAS regras que o servidor usa para validar o corpo. UM validador só, em
       `onChange`: com o schema também em `onSubmit`, o erro de um envio ficaria preso no
       campo mesmo depois de corrigido — ver o comentário em `use-task-form`. */
    validators: { onChange: ticketAnswerFormSchema },
    /* `mutate`, e não `await mutateAsync`: a recusa do servidor já chega à tela por
       `save.error`. Relançá-la daqui viraria uma rejeição sem dono no `handleSubmit`. */
    onSubmit: ({ value }: { value: TicketAnswerFormValues }) => {
      save.current.mutate(value);
    },
  }));

  const values = form.useSelector((state) => state.values);
  const fieldMeta = form.useSelector((state) => state.fieldMeta);
  const isSubmitted = form.useSelector((state) => state.submissionAttempts > 0);

  return {
    /* `get` em vez de valor: o model é montado uma vez e a tela lê dele a cada tecla. */
    get data() {
      const current = values.current;

      return {
        ticket: currentTicket,
        fields: {
          status: toFieldState(current.status, fieldMeta.current.status, isSubmitted.current),
          area: toFieldState(current.area, fieldMeta.current.area, isSubmitted.current),
          problemType: toFieldState(
            current.problemType,
            fieldMeta.current.problemType,
            isSubmitted.current,
          ),
          computerId: toFieldState(
            current.computerId,
            fieldMeta.current.computerId,
            isSubmitted.current,
          ),
          priority: toFieldState(current.priority, fieldMeta.current.priority, isSubmitted.current),
          assignee: toFieldState(current.assignee, fieldMeta.current.assignee, isSubmitted.current),
          solution: toFieldState(current.solution, fieldMeta.current.solution, isSubmitted.current),
        },
        whatsAppLink: buildNotice(ticket, current.status),
        machines: toMachineOptions(machines.current.data?.items ?? []),
        attachments: attachments.current.data ?? [],
        chosenFiles,
        availableParticipantAreas: toAvailableParticipantAreas(currentTicket),
        chosenParticipantArea,
      };
    },
    get state() {
      return {
        isSubmitting: save.current.isPending,
        error: readError(save.current.error),
        isAttachmentsLoading: attachments.current.isPending,
        isAttaching: attach.current.isPending,
        removingAttachmentId,
        isAddingArea: addArea.current.isPending,
        removingAreaArea,
        areaError,
        /* A recusa da ESCOLHA (o arquivo não cabe) e a da GRAVAÇÃO (a rede caiu) aparecem no
           mesmo lugar: para quem está olhando, as duas respondem "por que meu arquivo não
           entrou?". */
        attachmentError:
          attachmentError ??
          readError(attach.current.error) ??
          readError(removeAttachment.current.error),
      };
    },
    actions: {
      onChange: (field, value) => form.setFieldValue(field, value as never),
      /* `validateField` só marca "tocado" quando existe um `form.Field` montado — este hook
         chama `setFieldValue`/`validateField` direto, sem montar um. Sem marcar aqui, o erro
         nunca aparecia ao SAIR do campo (ver `toFieldState`, em form-projection.svelte.ts). */
      onBlur: (field) => {
        form.setFieldMeta(field, (prev) => ({ ...prev, isTouched: true }));
        void form.validateField(field, 'change');
      },
      onSubmit: () => void form.handleSubmit(),
      onChosenFilesChange: (files) => (chosenFiles = files),
      onAttachmentError: (message) => (attachmentError = message),
      onAttach: () => {
        if (chosenFiles.length === 0) return;

        attachmentError = null;
        attach.current.mutate(chosenFiles);
      },
      onRemoveAttachment: (attachment) => {
        removingAttachmentId = attachment.id;
        removeAttachment.current.mutate(attachment.id);
      },
      onChosenParticipantAreaChange: (area) => (chosenParticipantArea = area),
      onAddParticipantArea: () => {
        if (chosenParticipantArea === '') return;

        addArea.current.mutate(chosenParticipantArea);
      },
      onRemoveParticipantArea: (area) => {
        removingAreaArea = area;
        removeArea.current.mutate(area);
      },
    },
  };
}

/** Todas as áreas, menos a original e as que já são participantes — o que ainda pode entrar. */
function toAvailableParticipantAreas(
  ticket: Ticket,
): { value: TicketArea; label: string }[] {
  const taken = new Set<TicketArea>([ticket.area, ...ticket.participantAreas]);

  return ticketAreaOptions().filter((option) => !taken.has(option.value));
}

/**
 * O aviso de WhatsApp, com o texto já escrito.
 *
 * Nulo quando a pessoa NÃO pediu para ser avisada — ter o telefone dela no chamado não é
 * autorização para usá-lo. A situação vem do formulário, e não do chamado salvo, para o
 * texto já refletir o que quem atende acabou de escolher.
 */
function buildNotice(ticket: Ticket, status: string): string | null {
  if (!ticket.notifyWhatsapp) return null;

  const label = ticketStatusLabel(status as Ticket['status']);

  return buildWhatsAppLink(
    ticket.contactPhone,
    `Olá! Seu chamado ${ticket.protocol} está: ${label}.`,
  );
}

/**
 * Com que nome o campo "quem está atendendo" nasce.
 *
 * Quem já assumiu continua lá — abrir o chamado de um colega não pode trocar o responsável sem
 * ninguém perceber. Só quando ainda não há ninguém é que entra o nome de quem está logado: é
 * essa pessoa que abriu o chamado para atender, e digitar o próprio nome toda vez era o passo
 * que mais se esquecia. O campo continua editável.
 */
export function initialAssigneeOf(ticket: Ticket, attendantName?: string): string {
  return ticket.assignee?.trim() || attendantName?.trim() || '';
}

function toFormValues(ticket: Ticket, attendantName?: string): TicketAnswerFormValues {
  return {
    status: ticket.status,
    priority: ticket.priority,
    area: ticket.area,
    problemType: ticket.problemType,
    /* Vazio é "nenhuma máquina": no formulário tudo é texto, e é o view-model que traduz. */
    computerId: ticket.computerId === null ? '' : String(ticket.computerId),
    assignee: initialAssigneeOf(ticket, attendantName),
    solution: ticket.solution ?? '',
  };
}

/**
 * O que vai para a API. A máquina volta a ser número — ou NULO, que desvincula.
 *
 * `null` e "não mandar o campo" são coisas diferentes no contrato: um desfaz o vínculo, o
 * outro não mexe nele. Aqui sempre se manda, porque o formulário sempre tem uma resposta.
 */
function toUpdateInput(values: TicketAnswerFormValues) {
  return {
    status: values.status,
    priority: values.priority,
    area: values.area,
    problemType: values.problemType,
    computerId: values.computerId === '' ? null : Number(values.computerId),
    assignee: values.assignee,
    solution: values.solution,
  };
}

/** As máquinas do inventário, no formato do campo de escolha. */
function toMachineOptions(computers: readonly { id: number; name: string; displayName: string | null }[]) {
  return computers.map((computer) => ({
    value: String(computer.id),
    label: computer.displayName?.trim() ? `${computer.displayName} (${computer.name})` : computer.name,
  }));
}
