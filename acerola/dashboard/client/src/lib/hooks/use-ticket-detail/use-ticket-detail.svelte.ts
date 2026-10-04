import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { ticketStatusLabel } from '@template/shared/domain/ticket-status.util';
import { buildWhatsAppLink } from '@template/shared/domain/ticket-whatsapp.util';
import { type TicketAttachment } from '@template/shared/schemas/ticket-attachment.schema';
import { type TicketHistory } from '@template/shared/schemas/ticket-history.schema';
import { type Ticket } from '@template/shared/schemas/ticket.schema';
import { writable } from 'svelte/store';

import { ApiError, readError } from '$lib/api/http-client';
import { ticketsApi } from '$lib/api/tickets.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { TICKETS_QUERY_KEY } from '$lib/hooks/use-ticket-list/use-ticket-list.svelte';
import { triggerBrowserDownload } from '$lib/utils/download-file.util';

const NOT_FOUND = 404;

export type TicketDetailModel = {
  data: {
    ticket: Ticket | null;
    /** A linha do tempo, do mais antigo para o mais novo. */
    histories: TicketHistory[];
    /** Os arquivos do PRÓPRIO chamado — os que não entraram junto de um histórico. */
    attachments: TicketAttachment[];
    /** O link de aviso, pronto. Nulo quando a pessoa não pediu para ser avisada. */
    whatsAppLink: string | null;
  };
  state: {
    isLoading: boolean;
    /** O chamado não existe (ou não é de uma área que a pessoa atende). */
    isMissing: boolean;
    error: string | null;
    isTimelineLoading: boolean;
    timelineError: string | null;
    isAttachmentsLoading: boolean;
    /** Qual anexo está sendo excluído — trava a linha dele, não a lista. */
    removingAttachmentId: number | null;
    attachmentError: string | null;
    isDownloadingServiceOrder: boolean;
    serviceOrderError: string | null;
  };
  actions: {
    onRetry: () => void;
    onRemoveAttachment: (attachment: TicketAttachment) => void;
    onDownloadServiceOrder: () => void;
  };
};

/**
 * A FICHA de um chamado: os dados dele, a linha do tempo e os arquivos.
 *
 * Só LEITURA mora aqui (mais excluir anexo e baixar o PDF). Lançar histórico e corrigir os
 * dados têm o próprio view-model cada um (`use-ticket-history-form`, `use-ticket-data-form`):
 * são formulários, e formulário nasce e morre com o chamado que está na tela.
 *
 * As três consultas ficam embaixo da chave de chamados: qualquer gravação invalida
 * `TICKETS_QUERY_KEY` e a ficha inteira se refaz — estágio, linha do tempo e anexos juntos,
 * sem o risco de um deles ficar mostrando o passo anterior.
 */
export function useTicketDetailModel(id: number): TicketDetailModel {
  const queryClient = useQueryClient();

  const ticket = mirrorStore(
    createQuery(
      writable({
        queryKey: [...TICKETS_QUERY_KEY, 'detail', id],
        queryFn: () => ticketsApi.findById(id),
        /* 404 e 403 não mudam tentando de novo: repetir só atrasa o aviso. */
        retry: false,
      }),
    ),
  );

  const histories = mirrorStore(
    createQuery(
      writable({
        queryKey: [...TICKETS_QUERY_KEY, 'histories', id],
        queryFn: () => ticketsApi.histories(id),
        retry: false,
      }),
    ),
  );

  const attachments = mirrorStore(
    createQuery(
      writable({
        queryKey: [...TICKETS_QUERY_KEY, 'attachments', id],
        queryFn: () => ticketsApi.attachments(id),
        retry: false,
      }),
    ),
  );

  let removingAttachmentId = $state<number | null>(null);
  let isDownloadingServiceOrder = $state(false);
  let serviceOrderError = $state<string | null>(null);

  const removeAttachment = mirrorStore(
    createMutation({
      mutationFn: (attachmentId: number) => ticketsApi.removeAttachment(id, attachmentId),
      onSettled: async () => {
        removingAttachmentId = null;
        await queryClient.invalidateQueries({ queryKey: [...TICKETS_QUERY_KEY, 'attachments', id] });
      },
    }),
  );

  return {
    /* `get` em vez de valor: o model é montado uma vez e a tela lê dele a cada mudança. */
    get data() {
      const current = ticket.current.data ?? null;

      return {
        ticket: current,
        histories: histories.current.data ?? [],
        attachments: ownFilesOf(attachments.current.data ?? []),
        whatsAppLink: current ? buildNotice(current) : null,
      };
    },
    get state() {
      const isMissing = statusOf(ticket.current.error) === NOT_FOUND;

      return {
        isLoading: ticket.current.isPending,
        isMissing,
        error: isMissing ? null : readError(ticket.current.error),
        isTimelineLoading: histories.current.isPending,
        timelineError: readError(histories.current.error),
        isAttachmentsLoading: attachments.current.isPending,
        removingAttachmentId,
        attachmentError: readError(removeAttachment.current.error),
        isDownloadingServiceOrder,
        serviceOrderError,
      };
    },
    actions: {
      onRetry: () => {
        void ticket.current.refetch();
        void histories.current.refetch();
        void attachments.current.refetch();
      },
      onRemoveAttachment: (attachment) => {
        removingAttachmentId = attachment.id;
        removeAttachment.current.mutate(attachment.id);
      },
      onDownloadServiceOrder: () => {
        serviceOrderError = null;
        isDownloadingServiceOrder = true;

        ticketsApi
          .serviceOrder(id)
          .then(({ blob, fileName }) => triggerBrowserDownload(blob, fileName))
          .catch((error: unknown) => {
            serviceOrderError = readError(error) ?? 'Não consegui gerar a ordem de serviço.';
          })
          .finally(() => {
            isDownloadingServiceOrder = false;
          });
      },
    },
  };
}

/**
 * Os arquivos do PRÓPRIO chamado. Os que entraram junto de um histórico aparecem dentro dele,
 * na linha do tempo — mostrá-los também aqui seria o mesmo arquivo duas vezes na tela.
 */
export function ownFilesOf(attachments: readonly TicketAttachment[]): TicketAttachment[] {
  return attachments.filter((attachment) => attachment.historyId === null);
}

/**
 * O aviso de WhatsApp, com o texto já escrito.
 *
 * Nulo quando a pessoa NÃO pediu para ser avisada — ter o telefone dela no chamado não é
 * autorização para usá-lo.
 */
export function buildNotice(ticket: Ticket): string | null {
  if (!ticket.notifyWhatsapp) return null;

  return buildWhatsAppLink(
    ticket.contactPhone,
    `Olá! Seu chamado ${ticket.protocol} está: ${ticketStatusLabel(ticket.status)}.`,
  );
}

function statusOf(error: unknown): number | null {
  return error instanceof ApiError ? error.status : null;
}
