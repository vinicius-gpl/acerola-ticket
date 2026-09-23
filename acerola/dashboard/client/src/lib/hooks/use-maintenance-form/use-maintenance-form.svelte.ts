import { createForm } from '@tanstack/svelte-form';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { type Computer } from '@template/shared/schemas/computer.schema';
import {
  type Maintenance,
  type MaintenanceFormValues,
  maintenanceFormSchema,
} from '@template/shared/schemas/maintenance.schema';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import { writable } from 'svelte/store';

import { computersApi } from '$lib/api/computers.api';
import { readError } from '$lib/api/http-client';
import { maintenancesApi } from '$lib/api/maintenances.api';
import { type MaintenanceFormField } from '$lib/components/maintenance-form-dialog/maintenance-form-dialog.svelte';
import { toFieldState } from '$lib/hooks/form-projection/form-projection.svelte';
import { mirrorStore } from '$lib/hooks/mirror-store/mirror-store.svelte';
import { MAINTENANCES_QUERY_KEY } from '$lib/hooks/use-maintenance-list/use-maintenance-list.svelte';
import { COMPUTERS_QUERY_KEY } from '$lib/hooks/use-computer-list/use-computer-list.svelte';
import { type FormFieldState } from '$lib/types/form-field.type';

export type MachineOption = { value: string; label: string };

export type MaintenanceFormModel = {
  data: {
    mode: 'create' | 'edit';
    fields: Record<MaintenanceFormField, FormFieldState>;
    /** As máquinas do inventário, para o `select`. */
    machines: MachineOption[];
  };
  state: { isSubmitting: boolean; isMachinesLoading: boolean; error: string | null };
  actions: {
    onChange: (field: MaintenanceFormField, value: string) => void;
    onBlur: (field: MaintenanceFormField) => void;
    onSubmit: () => void;
  };
};

/**
 * O formulário de registrar manutenção e o de corrigir uma já registrada — o mesmo, porque
 * os campos são os mesmos.
 *
 * A lista de máquinas é buscada AQUI, e não pela tela: é dado, e dado não mora em componente
 * de UI (CONTRIBUTING §3). Ela vem do mesmo endpoint do inventário, então uma máquina
 * cadastrada agora aparece no formulário sem ninguém recarregar nada.
 *
 * O formulário começa com os valores de `maintenance` e NÃO acompanha mudanças dela depois de
 * aberto: quem troca de registro é o `{#key}` da rota, que monta este model de novo.
 */
export function useMaintenanceFormModel({
  maintenance,
  computerId,
  onSaved,
}: {
  maintenance: Maintenance | null;
  /** Máquina já escolhida — é assim que a ficha do computador abre o formulário. */
  computerId?: number | null;
  onSaved: () => void;
}): MaintenanceFormModel {
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
      mutationFn: async (values: MaintenanceFormValues) => {
        const body = toInput(values);

        if (maintenance) return maintenancesApi.update(maintenance.id, body);

        return maintenancesApi.create(body);
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: MAINTENANCES_QUERY_KEY });
        onSaved();
      },
    }),
  );

  const form = createForm(() => ({
    defaultValues: toFormValues(maintenance, computerId),
    /* As MESMAS regras que o servidor usa. Um validador só, em `onChange`: com o schema
       também em `onSubmit`, o erro de um envio vazio fica PRESO no campo mesmo depois de
       corrigido — ver o comentário em `use-task-form`. */
    validators: { onChange: maintenanceFormSchema },
    /* `mutate`, e não `await mutateAsync`: a recusa do servidor já chega à tela por
       `save.error`. Relançá-la daqui viraria uma rejeição sem dono no `handleSubmit`. */
    onSubmit: ({ value }: { value: MaintenanceFormValues }) => {
      save.current.mutate(value);
    },
  }));

  const values = form.useSelector((state) => state.values);
  const fieldMeta = form.useSelector((state) => state.fieldMeta);
  const isSubmitted = form.useSelector((state) => state.submissionAttempts > 0);

  return {
    /* `get` em vez de valor: o model é montado uma vez e a tela lê dele a cada tecla. */
    get data() {
      const field = (name: MaintenanceFormField): FormFieldState =>
        toFieldState(values.current[name], fieldMeta.current[name], isSubmitted.current);

      return {
        mode: maintenance ? ('edit' as const) : ('create' as const),
        fields: {
          computerId: field('computerId'),
          otherMachine: field('otherMachine'),
          type: field('type'),
          description: field('description'),
          performedBy: field('performedBy'),
          performedAt: field('performedAt'),
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
 * O apelido ganha do nome técnico, com o nome entre parênteses: quem registra o serviço
 * procura "o computador da recepção", e o técnico que lê depois precisa do RECEPCAO-01.
 */
function toMachineOptions(computers: readonly Computer[]): MachineOption[] {
  return computers.map((computer) => ({
    value: String(computer.id),
    label: computer.displayName?.trim()
      ? `${computer.displayName} (${computer.name})`
      : computer.name,
  }));
}

/** Hoje, no formato que o campo de data do navegador entende. */
function todayAsInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * O formulário em branco, pronto para registrar.
 *
 * Separado de `toFormValues` porque cada `??` conta como decisão, e a função juntando os dois
 * casos passava do teto de complexidade sem ter nenhuma decisão de verdade dentro.
 */
function blankForm(computerId?: number | null): MaintenanceFormValues {
  return {
    computerId: computerId ? String(computerId) : '',
    otherMachine: '',
    type: 'preventive',
    description: '',
    performedBy: '',
    /* Serviço lançado hoje é o caso comum; quem fez no sábado troca a data. */
    performedAt: todayAsInputValue(),
  };
}

function toFormValues(
  maintenance: Maintenance | null,
  computerId?: number | null,
): MaintenanceFormValues {
  if (!maintenance) return blankForm(computerId);

  return {
    computerId: maintenance.computerId ? String(maintenance.computerId) : '',
    otherMachine: maintenance.otherMachine ?? '',
    type: maintenance.type,
    description: maintenance.description ?? '',
    performedBy: maintenance.performedBy ?? '',
    /* Só a data, sem a hora: é o que o campo do navegador entende. */
    performedAt: maintenance.performedAt.slice(0, 10),
  };
}

/**
 * Do formulário para o contrato.
 *
 * A data vira meio-dia UTC de propósito: o campo do navegador entrega só `AAAA-MM-DD`, e
 * assumir meia-noite faria a data voltar um dia em qualquer fuso a oeste de Londres — o
 * serviço feito no dia 20 apareceria como dia 19 na tela de quem registrou.
 */
function toInput(values: MaintenanceFormValues) {
  const computerId = values.computerId ? Number(values.computerId) : null;

  return {
    computerId,
    otherMachine: computerId ? null : values.otherMachine.trim() || null,
    type: values.type,
    description: values.description.trim() || null,
    performedBy: values.performedBy.trim() || null,
    performedAt: new Date(`${values.performedAt}T12:00:00.000Z`).toISOString(),
  };
}
