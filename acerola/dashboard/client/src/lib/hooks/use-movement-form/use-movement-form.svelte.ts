import { createForm } from '@tanstack/svelte-form';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { type MovementType } from '@template/shared/domain/part-catalog.util';
import { type Computer } from '@template/shared/schemas/computer.schema';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import {
  type MovementFormValues,
  type Part,
  movementFormSchema,
} from '@template/shared/schemas/part.schema';
import { writable } from 'svelte/store';

import { computersApi } from '$lib/api/computers.api';
import { readError } from '$lib/api/http-client';
import { partsApi } from '$lib/api/parts.api';
import { type MovementFormField } from '$lib/components/movement-form-dialog/movement-form-dialog.svelte';
import { toFieldState } from '$lib/hooks/form-projection/form-projection.svelte';
import { mirrorStore } from '$lib/hooks/mirror-store/mirror-store.svelte';
import { COMPUTERS_QUERY_KEY } from '$lib/hooks/use-computer-list/use-computer-list.svelte';
import { PARTS_QUERY_KEY } from '$lib/hooks/use-part-list/use-part-list.svelte';
import { type FormFieldState } from '$lib/types/form-field.type';

export type MachineOption = { value: string; label: string };

export type MovementFormModel = {
  data: {
    part: Part;
    type: MovementType;
    fields: Record<MovementFormField, FormFieldState>;
    machines: MachineOption[];
  };
  state: { isSubmitting: boolean; isMachinesLoading: boolean; error: string | null };
  actions: {
    onChange: (field: MovementFormField, value: string) => void;
    onBlur: (field: MovementFormField) => void;
    onSubmit: () => void;
  };
};

/**
 * O formulário de ENTRADA e o de SAÍDA — o mesmo, porque os campos são os mesmos e só o
 * sinal muda.
 *
 * O tipo vem de fora, do botão que abriu o diálogo, e não é um campo: quem clicou em "Saída"
 * já disse o que queria, e um seletor ali dentro só criaria a chance de registrar o
 * contrário do que a pessoa pediu.
 *
 * A lista de máquinas é buscada AQUI, e não pela tela: é dado, e dado não mora em componente
 * de UI (CONTRIBUTING §3).
 */
export function useMovementFormModel({
  part,
  type,
  onSaved,
}: {
  part: Part;
  type: MovementType;
  onSaved: () => void;
}): MovementFormModel {
  const queryClient = useQueryClient();

  const machines = mirrorStore(
    createQuery(
      writable({
        queryKey: [...COMPUTERS_QUERY_KEY, 'options'],
        queryFn: () => computersApi.list({ page: 1, pageSize: MAX_PAGE_SIZE }),
      }),
    ),
  );

  const save = mirrorStore(
    createMutation({
      mutationFn: (values: MovementFormValues) =>
        partsApi.createMovement(part.id, {
          type,
          quantity: Number(values.quantity),
          computerId: values.computerId ? Number(values.computerId) : null,
          handledBy: values.handledBy.trim() || null,
          note: values.note.trim() || null,
        }),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: PARTS_QUERY_KEY });
        onSaved();
      },
    }),
  );

  const form = createForm(() => ({
    defaultValues: {
      type,
      quantity: '1',
      computerId: '',
      handledBy: '',
      note: '',
    } satisfies MovementFormValues,
    /* As MESMAS regras que o servidor usa. Um validador só, em `onChange` — ver o
       comentário em `use-task-form`. */
    validators: { onChange: movementFormSchema },
    /* `mutate`, e não `await mutateAsync`: a recusa do servidor (inclusive "só há 2 no
       depósito") já chega à tela por `save.error`. */
    onSubmit: ({ value }: { value: MovementFormValues }) => {
      save.current.mutate(value);
    },
  }));

  const values = form.useSelector((state) => state.values);
  const fieldMeta = form.useSelector((state) => state.fieldMeta);
  const isSubmitted = form.useSelector((state) => state.submissionAttempts > 0);

  return {
    /* `get` em vez de valor: o model é montado uma vez e a tela lê dele a cada tecla. */
    get data() {
      const field = (name: MovementFormField): FormFieldState =>
        toFieldState(values.current[name], fieldMeta.current[name], isSubmitted.current);

      return {
        part,
        type,
        fields: {
          quantity: field('quantity'),
          computerId: field('computerId'),
          handledBy: field('handledBy'),
          note: field('note'),
        },
        machines: toMachineOptions(machines.current.data?.items ?? []),
      };
    },
    get state() {
      return {
        isSubmitting: save.current.isPending,
        isMachinesLoading: machines.current.isPending,
        error: readError(save.current.error),
      };
    },
    actions: {
      onChange: (field, value) => form.setFieldValue(field, value as never),
      onBlur: (field) => void form.validateField(field, 'change'),
      onSubmit: () => void form.handleSubmit(),
    },
  };
}

/**
 * As máquinas como o `select` as mostra.
 *
 * O apelido ganha do nome técnico, com o nome entre parênteses: quem dá baixa numa peça
 * procura "o computador da recepção", e quem lê o extrato depois precisa do RECEPCAO-01.
 */
function toMachineOptions(computers: readonly Computer[]): MachineOption[] {
  return computers.map((computer) => ({
    value: String(computer.id),
    label: computer.displayName?.trim()
      ? `${computer.displayName} (${computer.name})`
      : computer.name,
  }));
}
