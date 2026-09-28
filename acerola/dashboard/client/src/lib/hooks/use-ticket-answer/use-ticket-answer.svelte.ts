import { createForm } from '@tanstack/svelte-form';
import { writable } from 'svelte/store';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { buildWhatsAppLink } from '@template/shared/domain/ticket-whatsapp.util';
import { type TicketAttachment } from '@template/shared/schemas/ticket-attachment.schema';
import { ticketStatusLabel } from '@template/shared/domain/ticket-status.util';
import {
  type Ticket,
  ticketAnswerFormSchema,
  type TicketAnswerFormValues,
} from '@template/shared/schemas/ticket.schema';

import { readError } from '$lib/api/http-client';
import { ticketsApi } from '$lib/api/tickets.api';
import { toFieldState } from '$lib/hooks/form-projection/form-projection.svelte';
import { mirrorStore } from '$lib/hooks/mirror-store/mirror-store.svelte';
import { TICKETS_QUERY_KEY } from '$lib/hooks/use-ticket-list/use-ticket-list.svelte';
import { type FormFieldState } from '$lib/types/form-field.type';

export type TicketAnswerField = 'status' | 'priority' | 'assignee' | 'solution';

export type TicketAnswerModel = {
  data: {
    ticket: Ticket;
    fields: Record<TicketAnswerField, FormFieldState>;
    /** O link de aviso, pronto. Nulo quando não há como (ou não se deve) avisar. */
    whatsAppLink: string | null;
    /** Os arquivos já anexados ao chamado. */
    attachments: TicketAttachment[];
    /** Os escolhidos agora, ainda não enviados. */
    chosenFiles: File[];
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
  };
  actions: {
    onChange: (field: TicketAnswerField, value: string) => void;
    onBlur: (field: TicketAnswerField) => void;
    onSubmit: () => void;
    onChosenFilesChange: (files: File[]) => void;
    onAttachmentError: (message: string | null) => void;
    onAttach: () => void;
    onRemoveAttachment: (attachment: TicketAttachment) => void;
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
  onSaved,
}: {
  ticket: Ticket;
  onSaved: () => void;
}): TicketAnswerModel {
  const queryClient = useQueryClient();

  /** A chave da consulta de anexos DESTE chamado: anexar e excluir a refazem. */
  const attachmentsKey = [...TICKETS_QUERY_KEY, 'attachments', ticket.id];

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
      mutationFn: (values: TicketAnswerFormValues) => ticketsApi.update(ticket.id, values),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
        onSaved();
      },
    }),
  );

  const form = createForm(() => ({
    defaultValues: toFormValues(ticket),
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
        ticket,
        fields: {
          status: toFieldState(current.status, fieldMeta.current.status, isSubmitted.current),
          priority: toFieldState(current.priority, fieldMeta.current.priority, isSubmitted.current),
          assignee: toFieldState(current.assignee, fieldMeta.current.assignee, isSubmitted.current),
          solution: toFieldState(current.solution, fieldMeta.current.solution, isSubmitted.current),
        },
        whatsAppLink: buildNotice(ticket, current.status),
        attachments: attachments.current.data ?? [],
        chosenFiles,
      };
    },
    get state() {
      return {
        isSubmitting: save.current.isPending,
        error: readError(save.current.error),
        isAttachmentsLoading: attachments.current.isPending,
        isAttaching: attach.current.isPending,
        removingAttachmentId,
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
    },
  };
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

function toFormValues(ticket: Ticket): TicketAnswerFormValues {
  return {
    status: ticket.status,
    priority: ticket.priority,
    assignee: ticket.assignee ?? '',
    solution: ticket.solution ?? '',
  };
}
