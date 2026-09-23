import { createForm } from '@tanstack/svelte-form';
import { createMutation } from '@tanstack/svelte-query';
import { buildWhatsAppLink } from '@template/shared/domain/ticket-whatsapp.util';
import {
  type Ticket,
  ticketFormSchema,
  type TicketFormValues,
} from '@template/shared/schemas/ticket.schema';

import { readError } from '$lib/api/http-client';
import { ticketsApi } from '$lib/api/tickets.api';
import { toFieldState } from '$lib/hooks/form-projection/form-projection.svelte';
import { mirrorStore } from '$lib/hooks/mirror-store/mirror-store.svelte';
import { type FormFieldState } from '$lib/types/form-field.type';

export type OpenTicketField =
  | 'requesterName'
  | 'department'
  | 'problemType'
  | 'anydeskId'
  | 'priority'
  | 'contactPhone'
  | 'description';

/** O que a pessoa vê depois de abrir: o protocolo para anotar. */
export type OpenedTicket = {
  protocol: string;
  whatsAppLink: string | null;
};

export type OpenTicketModel = {
  data: {
    fields: Record<OpenTicketField, FormFieldState>;
    notifyWhatsapp: boolean;
    /** O nome do print escolhido, para a pessoa conferir o que vai anexar. */
    screenshotName: string | null;
    opened: OpenedTicket | null;
  };
  state: { isSubmitting: boolean; error: string | null };
  actions: {
    onChange: (field: OpenTicketField, value: string) => void;
    onBlur: (field: OpenTicketField) => void;
    onNotifyChange: (notify: boolean) => void;
    onScreenshotChange: (file: File | null) => void;
    onSubmit: () => void;
    onOpenAnother: () => void;
  };
};

const EMPTY_VALUES: TicketFormValues = {
  requesterName: '',
  department: 'analyze',
  problemType: 'network',
  anydeskId: '',
  priority: 'medium',
  contactPhone: '',
  notifyWhatsapp: false,
  description: '',
};

/**
 * O formulário PÚBLICO de abrir chamado — sem login.
 *
 * Depois de abrir, a tela troca de assunto: em vez do formulário, mostra o protocolo. Esse é
 * o único dado que a pessoa precisa guardar, e enterrá-lo num aviso que some em três segundos
 * é a forma mais certa de ela voltar sem saber o número.
 */
export function useOpenTicketModel(): OpenTicketModel {
  let screenshot = $state<File | null>(null);
  let opened = $state<OpenedTicket | null>(null);

  const save = mirrorStore(
    createMutation({
      mutationFn: (values: TicketFormValues) => ticketsApi.create(values, screenshot),
      onSuccess: (ticket: Ticket) => {
        opened = { protocol: ticket.protocol, whatsAppLink: buildNotice(ticket) };
      },
    }),
  );

  const form = createForm(() => ({
    defaultValues: { ...EMPTY_VALUES },
    /* As MESMAS regras que o servidor usa. UM validador só, em `onChange`: com o schema
       também em `onSubmit`, o erro de um envio vazio ficaria preso no campo mesmo depois de
       corrigido — ver o comentário em `use-task-form`. */
    validators: { onChange: ticketFormSchema },
    onSubmit: ({ value }: { value: TicketFormValues }) => {
      save.current.mutate(value);
    },
  }));

  const values = form.useSelector((state) => state.values);
  const fieldMeta = form.useSelector((state) => state.fieldMeta);
  const isSubmitted = form.useSelector((state) => state.submissionAttempts > 0);

  const fieldOf = (field: OpenTicketField) =>
    toFieldState(values.current[field], fieldMeta.current[field], isSubmitted.current);

  return {
    get data() {
      return {
        fields: {
          requesterName: fieldOf('requesterName'),
          department: fieldOf('department'),
          problemType: fieldOf('problemType'),
          anydeskId: fieldOf('anydeskId'),
          priority: fieldOf('priority'),
          contactPhone: fieldOf('contactPhone'),
          description: fieldOf('description'),
        },
        notifyWhatsapp: values.current.notifyWhatsapp,
        screenshotName: screenshot?.name ?? null,
        opened,
      };
    },
    get state() {
      return { isSubmitting: save.current.isPending, error: readError(save.current.error) };
    },
    actions: {
      onChange: (field, value) => form.setFieldValue(field, value as never),
      onBlur: (field) => void form.validateField(field, 'change'),
      onNotifyChange: (notify) => form.setFieldValue('notifyWhatsapp', notify),
      onScreenshotChange: (file) => (screenshot = file),
      onSubmit: () => void form.handleSubmit(),
      /* Abrir outro chamado é um formulário NOVO, do zero: reaproveitar os valores do
         anterior faria a pessoa abrir sem querer o mesmo chamado duas vezes. */
      onOpenAnother: () => {
        opened = null;
        screenshot = null;
        save.current.reset();
        form.reset();
      },
    },
  };
}

/** O link que a pessoa usa para guardar o protocolo no próprio WhatsApp. */
function buildNotice(ticket: Ticket): string | null {
  if (!ticket.notifyWhatsapp) return null;

  return buildWhatsAppLink(
    ticket.contactPhone,
    `Protocolo do meu chamado no Grupo Azuos: ${ticket.protocol}. Guarde este número para acompanhar.`,
  );
}
