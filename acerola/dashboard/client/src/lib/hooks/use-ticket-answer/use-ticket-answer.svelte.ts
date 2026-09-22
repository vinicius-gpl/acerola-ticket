import { createForm } from '@tanstack/svelte-form';
import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import { buildWhatsAppLink } from '@template/shared/domain/ticket-whatsapp.util';
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
  };
  state: { isSubmitting: boolean; error: string | null };
  actions: {
    onChange: (field: TicketAnswerField, value: string) => void;
    onBlur: (field: TicketAnswerField) => void;
    onSubmit: () => void;
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
      };
    },
    get state() {
      return { isSubmitting: save.current.isPending, error: readError(save.current.error) };
    },
    actions: {
      onChange: (field, value) => form.setFieldValue(field, value as never),
      onBlur: (field) => void form.validateField(field, 'change'),
      onSubmit: () => void form.handleSubmit(),
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
    `Olá! Seu chamado ${ticket.protocol} no Grupo Azuos está: ${label}.`,
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
