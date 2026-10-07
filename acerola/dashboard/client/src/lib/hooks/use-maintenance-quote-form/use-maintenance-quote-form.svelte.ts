import { createForm } from '@tanstack/svelte-form';
import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import {
  centsToAmountText,
  refuseQuoteAttachment,
} from '@template/shared/domain/maintenance-quote.util';
import {
  type MaintenanceQuote,
  type MaintenanceQuoteFormValues,
  maintenanceQuoteFormSchema,
} from '@template/shared/schemas/maintenance-quote.schema';

import { readError } from '$lib/api/http-client';
import { maintenanceQuotesApi } from '$lib/api/maintenance-quotes.api';
import { type QuoteFormField } from '$lib/components/acerola-quote-form-dialog/acerola-quote-form-dialog.svelte';
import { toFieldState } from '$lib/hooks/use-form-projection/use-form-projection.svelte';
import { MAINTENANCE_DASHBOARD_QUERY_KEY } from '$lib/hooks/use-inventory-movement-form/use-inventory-movement-form.svelte';
import { MAINTENANCE_QUOTES_QUERY_KEY } from '$lib/hooks/use-maintenance-quote-list/use-maintenance-quote-list.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { type FormFieldState } from '$lib/types/form-field.type';
import { todayAsDay } from '$lib/utils/format-date';

export type MaintenanceQuoteFormModel = {
  data: {
    mode: 'create' | 'edit';
    fields: Record<QuoteFormField, FormFieldState>;
    /** O nome do documento à vista: o escolhido agora, o que já existe, ou nada. */
    attachment: { name: string | null };
  };
  state: { isSubmitting: boolean; error: string | null; attachmentError: string | null };
  actions: {
    onChange: (field: QuoteFormField, value: string) => void;
    onBlur: (field: QuoteFormField) => void;
    onAttachmentChange: (file: File | null) => void;
    onAttachmentRemove: () => void;
    onSubmit: () => void;
  };
};

/**
 * O formulário de guardar um orçamento e o de corrigi-lo.
 *
 * O DOCUMENTO não passa pelo TanStack Form: ele não é um campo de texto com validação de
 * schema, é um arquivo com regra própria (formato e tamanho, conferidos pelo mesmo domínio
 * que o servidor usa). Por isso vive num `$state` ao lado, com o erro dele separado —
 * recusar o arquivo não pode apagar o que a pessoa já digitou nos outros campos.
 *
 * O formulário começa com os valores de `quote` e NÃO acompanha mudanças dele depois de
 * aberto: quem troca de orçamento é o `{#key}` da rota, que monta este model de novo.
 */
export function useMaintenanceQuoteFormModel({
  quote,
  onSaved,
}: {
  quote: MaintenanceQuote | null;
  onSaved: () => void;
}): MaintenanceQuoteFormModel {
  const queryClient = useQueryClient();

  let attachmentFile = $state<File | null>(null);
  let attachmentError = $state<string | null>(null);
  /* A pessoa pediu para ficar SEM documento: é diferente de "não mexi no documento". */
  let attachmentRemoved = $state(false);

  const save = mirrorStore(
    createMutation({
      mutationFn: (values: MaintenanceQuoteFormValues) => {
        if (quote) {
          return maintenanceQuotesApi.update(quote.id, values, attachmentFile, attachmentRemoved);
        }

        return maintenanceQuotesApi.create(values, attachmentFile);
      },
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: MAINTENANCE_QUOTES_QUERY_KEY }),
          queryClient.invalidateQueries({ queryKey: MAINTENANCE_DASHBOARD_QUERY_KEY }),
        ]);
        onSaved();
      },
    }),
  );

  const form = createForm(() => ({
    defaultValues: toFormValues(quote),
    /* As MESMAS regras que o servidor usa. Um validador só, em `onChange`: com o schema
       também em `onSubmit`, o erro de um envio vazio fica PRESO no campo mesmo depois de
       corrigido — ver o comentário em `use-task-form`. */
    validators: { onChange: maintenanceQuoteFormSchema },
    /* `mutate`, e não `await mutateAsync`: a recusa do servidor já chega por `save.error`. */
    onSubmit: ({ value }: { value: MaintenanceQuoteFormValues }) => {
      save.current.mutate(value);
    },
  }));

  const values = form.useSelector((state) => state.values);
  const fieldMeta = form.useSelector((state) => state.fieldMeta);
  const isSubmitted = form.useSelector((state) => state.submissionAttempts > 0);

  /** O documento à vista: o novo vence, depois o que já existe — a não ser que foi tirado. */
  const attachmentName = (): string | null => {
    if (attachmentFile) return attachmentFile.name;
    if (attachmentRemoved) return null;

    return quote?.attachmentName ?? null;
  };

  return {
    /* `get` em vez de valor: o model é montado uma vez e a tela lê dele a cada tecla. */
    get data() {
      const field = (name: QuoteFormField): FormFieldState =>
        toFieldState(values.current[name], fieldMeta.current[name], isSubmitted.current);

      return {
        mode: quote ? ('edit' as const) : ('create' as const),
        fields: {
          supplier: field('supplier'),
          description: field('description'),
          kind: field('kind'),
          amount: field('amount'),
          quotedOn: field('quotedOn'),
          status: field('status'),
          note: field('note'),
        },
        attachment: { name: attachmentName() },
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
      onChange: (field, value) => form.setFieldValue(field, value as never),
      /* `validateField` só marca "tocado" quando existe um `form.Field` montado — este hook
         chama `setFieldValue`/`validateField` direto, sem montar um. */
      onBlur: (field) => {
        form.setFieldMeta(field, (prev) => ({ ...prev, isTouched: true }));
        void form.validateField(field, 'change');
      },
      /**
       * O arquivo escolhido passa pela MESMA régua do servidor antes de qualquer coisa: a
       * pessoa descobre que ele não serve na hora, e não depois de esperar o envio.
       */
      onAttachmentChange: (file) => {
        if (!file) {
          attachmentFile = null;
          attachmentError = null;
          return;
        }

        const refusal = refuseQuoteAttachment({ contentType: file.type, sizeBytes: file.size });
        if (refusal) {
          attachmentFile = null;
          attachmentError = refusal.message;
          return;
        }

        attachmentFile = file;
        attachmentError = null;
        attachmentRemoved = false;
      },
      onAttachmentRemove: () => {
        attachmentFile = null;
        attachmentError = null;
        attachmentRemoved = true;
      },
      onSubmit: () => void form.handleSubmit(),
    },
  };
}

/**
 * Os valores iniciais do formulário.
 *
 * Early return no orçamento novo (CONTRIBUTING §2): ele nasce com a data de hoje e
 * aguardando decisão, que é o caso de quase todo orçamento que acabou de chegar.
 */
function toFormValues(quote: MaintenanceQuote | null): MaintenanceQuoteFormValues {
  if (!quote) {
    return {
      supplier: '',
      description: '',
      kind: 'service',
      amount: '',
      quotedOn: todayAsDay(),
      status: 'pending',
      note: '',
    };
  }

  return {
    supplier: quote.supplier,
    description: quote.description,
    kind: quote.kind,
    amount: centsToAmountText(quote.amountCents),
    quotedOn: quote.quotedOn,
    status: quote.status,
    note: quote.note ?? '',
  };
}
