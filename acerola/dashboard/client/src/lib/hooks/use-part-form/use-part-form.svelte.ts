import { createForm } from '@tanstack/svelte-form';
import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import {
  type Part,
  type PartFormValues,
  partFormSchema,
} from '@template/shared/schemas/part.schema';

import { readError } from '$lib/api/http-client';
import { partsApi } from '$lib/api/parts.api';
import { type PartFormField } from '$lib/components/part-form-dialog/part-form-dialog.svelte';
import { toFieldState } from '$lib/hooks/form-projection/form-projection.svelte';
import { mirrorStore } from '$lib/hooks/mirror-store/mirror-store.svelte';
import { PARTS_QUERY_KEY } from '$lib/hooks/use-part-list/use-part-list.svelte';
import { type FormFieldState } from '$lib/types/form-field.type';

export type PartFormModel = {
  data: {
    mode: 'create' | 'edit';
    fields: Record<PartFormField, FormFieldState>;
  };
  state: { isSubmitting: boolean; error: string | null };
  actions: {
    onChange: (field: PartFormField, value: string) => void;
    onBlur: (field: PartFormField) => void;
    onSubmit: () => void;
  };
};

/**
 * O formulário de cadastrar peça e o de corrigir o cadastro dela.
 *
 * **A quantidade só existe no cadastro.** Depois, o saldo só se move por entrada e saída:
 * um campo de quantidade na edição seria um jeito de reescrever o estoque sem deixar linha
 * no extrato, e o número passaria a discordar do histórico que deveria explicá-lo.
 *
 * O formulário começa com os valores de `part` e NÃO acompanha mudanças dela depois de
 * aberto: quem troca de peça é o `{#key}` da rota, que monta este model de novo.
 */
export function usePartFormModel({
  part,
  onSaved,
}: {
  part: Part | null;
  onSaved: () => void;
}): PartFormModel {
  const queryClient = useQueryClient();

  const save = mirrorStore(
    createMutation({
      mutationFn: (values: PartFormValues) => {
        if (part) {
          return partsApi.update(part.id, {
            name: values.name,
            category: values.category,
            condition: values.condition,
          });
        }

        return partsApi.create({
          name: values.name,
          category: values.category,
          condition: values.condition,
          /* Em branco é zero: a peça entra cadastrada, com a prateleira vazia. */
          initialQuantity: values.initialQuantity === '' ? 0 : Number(values.initialQuantity),
        });
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: PARTS_QUERY_KEY });
        onSaved();
      },
    }),
  );

  const form = createForm(() => ({
    defaultValues: toFormValues(part),
    /* As MESMAS regras que o servidor usa. Um validador só, em `onChange`: com o schema
       também em `onSubmit`, o erro de um envio vazio fica PRESO no campo mesmo depois de
       corrigido — ver o comentário em `use-task-form`. */
    validators: { onChange: partFormSchema },
    /* `mutate`, e não `await mutateAsync`: a recusa do servidor já chega à tela por
       `save.error`. Relançá-la daqui viraria uma rejeição sem dono no `handleSubmit`. */
    onSubmit: ({ value }: { value: PartFormValues }) => {
      save.current.mutate(value);
    },
  }));

  const values = form.useSelector((state) => state.values);
  const fieldMeta = form.useSelector((state) => state.fieldMeta);
  const isSubmitted = form.useSelector((state) => state.submissionAttempts > 0);

  return {
    /* `get` em vez de valor: o model é montado uma vez e a tela lê dele a cada tecla. */
    get data() {
      const field = (name: PartFormField): FormFieldState =>
        toFieldState(values.current[name], fieldMeta.current[name], isSubmitted.current);

      return {
        mode: part ? ('edit' as const) : ('create' as const),
        fields: {
          name: field('name'),
          category: field('category'),
          condition: field('condition'),
          initialQuantity: field('initialQuantity'),
        },
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

function toFormValues(part: Part | null): PartFormValues {
  return {
    name: part?.name ?? '',
    category: part?.category ?? 'other',
    condition: part?.condition ?? 'new',
    initialQuantity: '',
  };
}
