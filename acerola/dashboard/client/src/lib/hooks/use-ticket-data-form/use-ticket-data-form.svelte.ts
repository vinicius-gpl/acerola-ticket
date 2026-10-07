import { createForm } from '@tanstack/svelte-form';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { ticketAreaOptions, type TicketArea } from '@template/shared/domain/ticket-catalog.util';
import {
  type Ticket,
  ticketDataFormSchema,
  type TicketDataFormValues,
} from '@template/shared/schemas/ticket.schema';
import { writable } from 'svelte/store';

import { computersApi } from '$lib/api/computers.api';
import { readError } from '$lib/api/http-client';
import { softwareProjectsApi } from '$lib/api/software-projects.api';
import { ticketsApi } from '$lib/api/tickets.api';
import { COMPUTERS_QUERY_KEY } from '$lib/hooks/use-computer-list/use-computer-list.svelte';
import { toFieldState } from '$lib/hooks/use-form-projection/use-form-projection.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { SOFTWARE_PROJECTS_QUERY_KEY } from '$lib/hooks/use-software-project-list/use-software-project-list.svelte';
import { TICKETS_QUERY_KEY } from '$lib/hooks/use-ticket-list/use-ticket-list.svelte';
import { type FormFieldState } from '$lib/types/form-field.type';

/** Uma página grande o bastante para caber o parque inteiro num campo de escolha. */
const MACHINE_OPTIONS_PAGE_SIZE = 200;

export type TicketDataField = 'priority' | 'area' | 'problemType' | 'computerId' | 'projectId';

export type TicketDataFormModel = {
  data: {
    ticket: Ticket;
    fields: Record<TicketDataField, FormFieldState>;
    /** As máquinas do inventário, para vincular o chamado a uma delas. */
    machines: { value: string; label: string }[];
    /** Os sistemas/projetos para vincular o chamado a um deles. */
    projects: { value: string; label: string }[];
    /** As áreas que ainda PODEM entrar como participante — todas, menos as que já estão. */
    availableParticipantAreas: { value: TicketArea; label: string }[];
  };
  state: {
    isSubmitting: boolean;
    /** Acabou de salvar — a tela confirma, e some na próxima tecla. */
    isSaved: boolean;
    error: string | null;
    isAddingArea: boolean;
    /** Qual área participante está sendo removida — trava o chip dela, não a lista toda. */
    removingAreaArea: TicketArea | null;
    areaError: string | null;
  };
  actions: {
    onChange: (field: TicketDataField, value: string) => void;
    onBlur: (field: TicketDataField) => void;
    onSubmit: () => void;
    onAddParticipantArea: (area: TicketArea) => void;
    onRemoveParticipantArea: (area: TicketArea) => void;
  };
};

/**
 * Os DADOS do chamado que o TI corrige: urgência, área, tipo de problema e máquina.
 *
 * O ESTÁGIO não está aqui, de propósito: ele só muda lançando um histórico
 * (`use-ticket-history-form`). Nada que identifique quem abriu é editável — corrigir o nome ou
 * o telefone de um chamado alheio apagaria o que a pessoa de fato escreveu.
 *
 * O formulário começa com os valores do chamado e NÃO acompanha mudanças dele depois de
 * montado: a rota o monta dentro de um `{#key}` pelo id. Sincronizar com efeito apagaria o que
 * quem atende estava digitando quando a ficha recarregasse por trás.
 */
export function useTicketDataFormModel({ ticket }: { ticket: Ticket }): TicketDataFormModel {
  const queryClient = useQueryClient();

  /* A MESMA chave do formulário de manutenção: as duas telas pedem a lista de máquinas para
     um campo de escolha, e uma chave só faz a segunda aproveitar o que a primeira buscou. */
  const machines = mirrorStore(
    createQuery(
      writable({
        queryKey: [...COMPUTERS_QUERY_KEY, 'options'],
        queryFn: () => computersApi.list({ page: 1, pageSize: MACHINE_OPTIONS_PAGE_SIZE }),
      }),
    ),
  );

  const projects = mirrorStore(
    createQuery(
      writable({
        queryKey: [...SOFTWARE_PROJECTS_QUERY_KEY, 'options'],
        queryFn: () => softwareProjectsApi.list({ page: 1, pageSize: 200 }),
      }),
    ),
  );

  let isSaved = $state(false);

  const save = mirrorStore(
    createMutation({
      mutationFn: (values: TicketDataFormValues) => ticketsApi.update(ticket.id, toUpdateInput(values)),
      onSuccess: async () => {
        isSaved = true;
        await queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
      },
    }),
  );

  /* As áreas participantes (#13) são um pedido PRÓPRIO, fora do formulário: adicionar ou tirar
     uma área acontece na hora. `currentTicket` existe porque `ticket` (o parâmetro) é o estado
     de QUANDO o formulário montou — sem ele, a área adicionada não apareceria. */
  let currentTicket = $state(ticket);
  let removingAreaArea = $state<TicketArea | null>(null);
  let areaError = $state<string | null>(null);

  const addArea = mirrorStore(
    createMutation({
      mutationFn: (area: TicketArea) => ticketsApi.addArea(ticket.id, area),
      onSuccess: async (updated) => {
        currentTicket = updated;
        areaError = null;
        await queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
      },
      onError: (error: unknown) => {
        areaError = readError(error) ?? 'Não consegui adicionar a área.';
      },
    }),
  );

  const removeArea = mirrorStore(
    createMutation({
      mutationFn: (area: TicketArea) => ticketsApi.removeArea(ticket.id, area),
      onSuccess: async (updated) => {
        currentTicket = updated;
        areaError = null;
        await queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
      },
      onError: (error: unknown) => {
        areaError = readError(error) ?? 'Não consegui remover a área.';
      },
      onSettled: () => {
        removingAreaArea = null;
      },
    }),
  );

  const form = createForm(() => ({
    defaultValues: toFormValues(ticket),
    /* UM validador só, em `onChange` — ver o comentário em `use-task-form`. */
    validators: { onChange: ticketDataFormSchema },
    /* `mutate`, e não `await mutateAsync`: a recusa do servidor já chega por `save.error`. */
    onSubmit: ({ value }: { value: TicketDataFormValues }) => {
      save.current.mutate(value);
    },
  }));

  const values = form.useSelector((state) => state.values);
  const fieldMeta = form.useSelector((state) => state.fieldMeta);
  const isSubmitted = form.useSelector((state) => state.submissionAttempts > 0);

  const fieldOf = (field: TicketDataField): FormFieldState =>
    toFieldState(values.current[field], fieldMeta.current[field], isSubmitted.current);

  return {
    /* `get` em vez de valor: o model é montado uma vez e a tela lê dele a cada tecla. */
    get data() {
      return {
        ticket: currentTicket,
        fields: {
          priority: fieldOf('priority'),
          area: fieldOf('area'),
          problemType: fieldOf('problemType'),
          computerId: fieldOf('computerId'),
          projectId: fieldOf('projectId'),
        },
        machines: toMachineOptions(machines.current.data?.items ?? []),
        projects: toProjectOptions(projects.current.data?.items ?? []),
        availableParticipantAreas: toAvailableParticipantAreas(currentTicket),
      };
    },
    get state() {
      return {
        isSubmitting: save.current.isPending,
        isSaved,
        error: readError(save.current.error),
        isAddingArea: addArea.current.isPending,
        removingAreaArea,
        areaError,
      };
    },
    actions: {
      onChange: (field, value) => {
        /* Mexeu de novo: o "salvo" de antes já não descreve o que está na tela. */
        isSaved = false;
        form.setFieldValue(field, value as never);
      },
      onBlur: (field) => {
        form.setFieldMeta(field, (prev) => ({ ...prev, isTouched: true }));
        void form.validateField(field, 'change');
      },
      onSubmit: () => void form.handleSubmit(),
      onAddParticipantArea: (area) => addArea.current.mutate(area),
      onRemoveParticipantArea: (area) => {
        removingAreaArea = area;
        removeArea.current.mutate(area);
      },
    },
  };
}

/** Todas as áreas, menos a original e as que já são participantes — o que ainda pode entrar. */
export function toAvailableParticipantAreas(
  ticket: Ticket,
): { value: TicketArea; label: string }[] {
  const taken: TicketArea[] = [ticket.area, ...ticket.participantAreas];

  return ticketAreaOptions().filter((option) => !taken.includes(option.value));
}

export function toFormValues(ticket: Ticket): TicketDataFormValues {
  return {
    priority: ticket.priority,
    area: ticket.area,
    problemType: ticket.problemType,
    /* Vazio é "nenhuma máquina": no formulário tudo é texto, e é o view-model que traduz. */
    computerId: ticket.computerId === null ? '' : String(ticket.computerId),
    projectId:
      ticket.projectId !== null && ticket.projectId !== undefined
        ? String(ticket.projectId)
        : '',
  };
}

/**
 * O que vai para a API. A máquina volta a ser número — ou NULO, que desvincula.
 *
 * `null` e "não mandar o campo" são coisas diferentes no contrato: um desfaz o vínculo, o
 * outro não mexe nele. Aqui sempre se manda, porque o formulário sempre tem uma resposta.
 */
export function toUpdateInput(values: TicketDataFormValues) {
  return {
    priority: values.priority,
    area: values.area,
    problemType: values.problemType,
    computerId: values.computerId === '' ? null : Number(values.computerId),
    ...(values.projectId !== undefined
      ? { projectId: values.projectId === '' ? null : Number(values.projectId) }
      : {}),
  };
}

/** As máquinas do inventário, no formato do campo de escolha. */
export function toMachineOptions(
  computers: readonly { id: number; name: string; displayName: string | null }[],
) {
  return computers.map((computer) => ({
    value: String(computer.id),
    label: computer.displayName?.trim() ? `${computer.displayName} (${computer.name})` : computer.name,
  }));
}

/** Os projetos cadastrados, no formato do campo de escolha. */
export function toProjectOptions(
  projects: readonly { id: number; name: string }[],
) {
  return projects.map((project) => ({
    value: String(project.id),
    label: project.name,
  }));
}
