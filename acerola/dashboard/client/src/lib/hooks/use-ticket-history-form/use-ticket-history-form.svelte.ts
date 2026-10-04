import { createForm } from '@tanstack/svelte-form';
import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import {
  isClosingTicketHistoryType,
  ticketHistoryEffect,
  ticketHistoryEffectLabel,
  ticketHistoryTone,
  ticketHistoryTypeGroups,
  ticketHistoryTypeLabel,
  type ManualTicketHistoryType,
  type TicketHistoryEffect,
  type TicketHistoryTone,
} from '@template/shared/domain/ticket-history.util';
import { type TicketStatus } from '@template/shared/domain/ticket-status.util';
import {
  HISTORY_MINUTES_MAX,
  ticketHistoryFormSchema,
  type TicketHistoryFormValues,
} from '@template/shared/schemas/ticket-history.schema';
import { type Ticket } from '@template/shared/schemas/ticket.schema';

import { readError } from '$lib/api/http-client';
import { ticketsApi } from '$lib/api/tickets.api';
import { toFieldState } from '$lib/hooks/use-form-projection/use-form-projection.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { TICKETS_QUERY_KEY } from '$lib/hooks/use-ticket-list/use-ticket-list.svelte';
import { type FormFieldState } from '$lib/types/form-field.type';

export type TicketHistoryTypeOption = {
  value: ManualTicketHistoryType;
  label: string;
  tone: TicketHistoryTone;
};

export type TicketHistoryFormModel = {
  data: {
    /** O tipo escolhido. */
    type: ManualTicketHistoryType;
    /**
     * As opções de tipo, JÁ SEPARADAS pelo que fazem: as que dão andamento e as que encerram.
     * É a separação que impede "encerrar" de ficar misturado no meio de "registrar andamento".
     */
    groups: { continuing: TicketHistoryTypeOption[]; closing: TicketHistoryTypeOption[] };
    /** O que o tipo escolhido FAZ com o chamado — decide a cor do aviso e o texto do botão. */
    effect: TicketHistoryEffect;
    /** A frase que diz isso, pronta para a tela. */
    effectLabel: string;
    fields: Record<'description' | 'minutesSpent', FormFieldState>;
    isVisibleToRequester: boolean;
    /** Os arquivos escolhidos agora, que entram junto com o histórico. */
    chosenFiles: File[];
  };
  state: {
    isSubmitting: boolean;
    error: string | null;
    /** A recusa da ESCOLHA de um arquivo (não cabe, formato errado). */
    attachmentError: string | null;
  };
  actions: {
    onTypeChange: (type: ManualTicketHistoryType) => void;
    onChange: (field: 'description' | 'minutesSpent', value: string) => void;
    onBlur: (field: 'description' | 'minutesSpent') => void;
    onVisibilityChange: (isVisible: boolean) => void;
    onChosenFilesChange: (files: File[]) => void;
    onAttachmentError: (message: string | null) => void;
    onSubmit: () => void;
  };
};

/**
 * LANÇAR UM HISTÓRICO num chamado — o único gesto que muda o estágio dele.
 *
 * Quais tipos cabem, quais encerram e o que cada um faz NÃO são decididos aqui: vêm do domínio
 * (`ticket-history.util`), pela mesma função que a API usa para recusar. A tela só mostra.
 *
 * O formulário é montado para o ESTÁGIO em que o chamado está: a rota o remonta (`{#key}`)
 * quando o estágio muda, porque as opções mudam junto — num chamado encerrado só existe
 * "Reabertura".
 */
export function useTicketHistoryFormModel({
  ticket,
  onRecorded,
}: {
  ticket: Ticket;
  onRecorded?: () => void;
}): TicketHistoryFormModel {
  const queryClient = useQueryClient();

  let chosenFiles = $state<File[]>([]);
  let attachmentError = $state<string | null>(null);

  const groups = toOptionGroups(ticket.status);

  const save = mirrorStore(
    createMutation({
      mutationFn: (values: TicketHistoryFormValues) =>
        ticketsApi.createHistory(ticket.id, values, chosenFiles),
      onSuccess: async () => {
        chosenFiles = [];
        attachmentError = null;
        form.reset();
        /* A chave inteira de chamados: o histórico muda o estágio, a linha do tempo, os anexos,
           a fila e os indicadores — refazer só um deles deixaria os outros no passo anterior. */
        await queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
        onRecorded?.();
      },
    }),
  );

  const form = createForm(() => ({
    defaultValues: initialValuesFor(ticket.status),
    /* UM validador só, em `onChange` — ver o comentário em `use-task-form`. */
    validators: { onChange: ticketHistoryFormSchema },
    /* `mutate`, e não `await mutateAsync`: a recusa do servidor já chega por `save.error`. */
    onSubmit: ({ value }: { value: TicketHistoryFormValues }) => {
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
        type: current.type,
        groups,
        effect: ticketHistoryEffect(current.type),
        effectLabel: ticketHistoryEffectLabel(current.type),
        fields: {
          description: toFieldState(
            current.description,
            fieldMeta.current.description,
            isSubmitted.current,
          ),
          minutesSpent: toFieldState(
            current.minutesSpent,
            fieldMeta.current.minutesSpent,
            isSubmitted.current,
          ),
        },
        isVisibleToRequester: current.isVisibleToRequester,
        chosenFiles,
      };
    },
    get state() {
      return {
        isSubmitting: save.current.isPending,
        error: readError(save.current.error),
        attachmentError,
      };
    },
    actions: {
      onTypeChange: (type) => form.setFieldValue('type', type),
      /* O tempo só aceita dígitos JÁ NA DIGITAÇÃO: a letra nem entra no campo. A validação do
         contrato continua valendo por baixo — é ela que recusa um tempo absurdo. */
      onChange: (field, value) =>
        form.setFieldValue(field, field === 'minutesSpent' ? toMinutesInput(value) : value),
      /* `validateField` só marca "tocado" quando existe um `form.Field` montado — este hook
         chama `setFieldValue`/`validateField` direto. Sem marcar aqui, o erro nunca apareceria
         ao SAIR do campo (ver `toFieldState`). */
      onBlur: (field) => {
        form.setFieldMeta(field, (prev) => ({ ...prev, isTouched: true }));
        void form.validateField(field, 'change');
      },
      onVisibilityChange: (isVisible) => form.setFieldValue('isVisibleToRequester', isVisible),
      onChosenFilesChange: (files) => (chosenFiles = files),
      onAttachmentError: (message) => (attachmentError = message),
      onSubmit: () => void form.handleSubmit(),
    },
  };
}

function toOption(type: ManualTicketHistoryType): TicketHistoryTypeOption {
  return { value: type, label: ticketHistoryTypeLabel(type), tone: ticketHistoryTone(type) };
}

/** As opções de tipo para um chamado neste estágio, nos dois grupos que a tela mostra. */
export function toOptionGroups(status: TicketStatus): TicketHistoryFormModel['data']['groups'] {
  const groups = ticketHistoryTypeGroups(status);

  return {
    continuing: groups.continuing.map(toOption),
    closing: groups.closing.map(toOption),
  };
}

/**
 * Com que tipo o formulário nasce.
 *
 * NUNCA um tipo que encerra: o gesto que tira o chamado da fila tem de ser escolhido, não
 * herdado de um padrão. "Andamento" é o mais comum e o mais inofensivo; quando ele não cabe
 * (chamado encerrado), entra o primeiro que cabe — a reabertura.
 */
export function initialTypeFor(status: TicketStatus): ManualTicketHistoryType {
  const { continuing, closing } = ticketHistoryTypeGroups(status);
  const safest = continuing.find((type) => type === 'note') ?? continuing[0];

  /* Um estágio em que só cabem tipos que encerram não existe hoje; se um dia existir, o
     formulário ainda precisa nascer com um valor válido. */
  return safest ?? closing[0] ?? 'note';
}

export function initialValuesFor(status: TicketStatus): TicketHistoryFormValues {
  return {
    type: initialTypeFor(status),
    description: '',
    /* O padrão é a pessoa acompanhar o que acontece com o pedido dela. */
    isVisibleToRequester: true,
    minutesSpent: '',
  };
}

/** Quantos dígitos o campo de tempo guarda — os do maior tempo que o contrato aceita. */
const MINUTES_INPUT_MAX_LENGTH = String(HISTORY_MINUTES_MAX).length;

/**
 * O que fica no campo de tempo depois de uma tecla: só os dígitos.
 *
 * Colar "1h30" vira "130", e não um erro: quem cola vê na hora que o campo é em minutos, em vez
 * de descobrir só ao enviar.
 */
export function toMinutesInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, MINUTES_INPUT_MAX_LENGTH);
}

/** O texto do botão de enviar: encerrar é dito com a palavra, não só com a cor. */
export function submitLabelFor(type: ManualTicketHistoryType): string {
  return isClosingTicketHistoryType(type) ? 'Encerrar chamado' : 'Registrar histórico';
}
