import { createForm } from '@tanstack/svelte-form';
import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import { type Department } from '@template/shared/domain/department.util';
import {
  type Computer,
  type ComputerCreateFormValues,
  computerCreateFormSchema,
} from '@template/shared/schemas/computer.schema';

import { computersApi } from '$lib/api/computers.api';
import { readError } from '$lib/api/http-client';
import { type ComputerFormField } from '$lib/components/computer-form-dialog/computer-form-dialog.svelte';
import { toFieldState } from '$lib/hooks/form-projection/form-projection.svelte';
import { mirrorStore } from '$lib/hooks/mirror-store/mirror-store.svelte';
import { COMPUTERS_QUERY_KEY } from '$lib/hooks/use-computer-list/use-computer-list.svelte';
import { type FormFieldState } from '$lib/types/form-field.type';

/** O token recém-gerado e a máquina dele — o que a tela precisa mostrar depois do cadastro. */
export type CreatedAgentToken = { token: string; computerName: string };

export type ComputerFormModel = {
  data: {
    mode: 'create' | 'edit';
    fields: Record<ComputerFormField, FormFieldState>;
  };
  state: { isSubmitting: boolean; error: string | null };
  actions: {
    onChange: (field: ComputerFormField, value: string) => void;
    onBlur: (field: ComputerFormField) => void;
    onSubmit: () => void;
  };
};

/**
 * O formulário de cadastrar máquina e o de corrigir a identificação dela — o mesmo, porque
 * os campos são quase os mesmos.
 *
 * **O nome só é editável no cadastro.** Depois da primeira conexão, quem diz o nome é a
 * própria máquina; deixar digitar aqui faria a ficha discordar do que o agente informa na
 * leitura seguinte, e a pessoa passaria a procurar uma máquina que não existe com aquele nome.
 *
 * O formulário começa com os valores de `computer` e NÃO acompanha mudanças dela depois de
 * aberto: a rota o monta dentro de um `{#key}` pelo id. Acompanhar apagaria o que a pessoa
 * está digitando quando a lista recarregasse por trás.
 */
export function useComputerFormModel({
  computer,
  onSaved,
}: {
  computer: Computer | null;
  onSaved: (created: CreatedAgentToken | null) => void;
}): ComputerFormModel {
  const queryClient = useQueryClient();

  const save = mirrorStore(
    createMutation({
      mutationFn: async (values: ComputerCreateFormValues) => {
        /* No cadastro o nome vai junto e a resposta traz o TOKEN, que a tela precisa mostrar
           na hora. Na edição ele nem é enviado: o servidor recusaria, e com razão. */
        if (!computer) return computersApi.create(toCreateInput(values));

        await computersApi.update(computer.id, toUpdateInput(values));

        return null;
      },
      onSuccess: async (created) => {
        await queryClient.invalidateQueries({ queryKey: COMPUTERS_QUERY_KEY });
        onSaved(created ? { token: created.token, computerName: created.computer.name } : null);
      },
    }),
  );

  const form = createForm(() => ({
    defaultValues: toFormValues(computer),
    /* As MESMAS regras que o servidor usa. Um validador só, em `onChange`: com o schema
       também em `onSubmit`, o erro de um envio vazio fica PRESO no campo mesmo depois de
       corrigido — ver o comentário em `use-task-form`. */
    validators: { onChange: computerCreateFormSchema },
    /* `mutate`, e não `await mutateAsync`: a recusa do servidor já chega à tela por
       `save.error`. Relançá-la daqui viraria uma rejeição sem dono no `handleSubmit`. */
    onSubmit: ({ value }: { value: ComputerCreateFormValues }) => {
      save.current.mutate(value);
    },
  }));

  const values = form.useSelector((state) => state.values);
  const fieldMeta = form.useSelector((state) => state.fieldMeta);
  const isSubmitted = form.useSelector((state) => state.submissionAttempts > 0);

  return {
    /* `get` em vez de valor: o model é montado uma vez e a tela lê dele a cada tecla. */
    get data() {
      const field = (name: ComputerFormField): FormFieldState =>
        toFieldState(values.current[name], fieldMeta.current[name], isSubmitted.current);

      return {
        mode: computer ? ('edit' as const) : ('create' as const),
        fields: {
          name: field('name'),
          displayName: field('displayName'),
          responsibleName: field('responsibleName'),
          department: field('department'),
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

function toFormValues(computer: Computer | null): ComputerCreateFormValues {
  return {
    name: computer?.name ?? '',
    displayName: computer?.displayName ?? '',
    responsibleName: computer?.responsibleName ?? '',
    department: computer?.department ?? '',
  };
}

/**
 * Campo em branco vira `null`, e não string vazia.
 *
 * "Sem responsável" e "responsável chamado nada" são coisas diferentes, e só a primeira
 * existe: o contrato guarda ausência como nulo, e a lista sabe mostrar isso.
 */
function toCreateInput(values: ComputerCreateFormValues) {
  return { name: values.name.trim(), ...toUpdateInput(values) };
}

function toUpdateInput(values: ComputerCreateFormValues) {
  return {
    displayName: values.displayName.trim() || null,
    responsibleName: values.responsibleName.trim() || null,
    department: (values.department || null) as Department | null,
  };
}
