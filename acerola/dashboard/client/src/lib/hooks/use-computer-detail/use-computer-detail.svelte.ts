import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import {
  type Computer,
  type ComputerAlert,
  type ComputerSample,
  type UpdateComputerInput,
} from '@template/shared/schemas/computer.schema';
import { writable } from 'svelte/store';

import { computersApi } from '$lib/api/computers.api';
import { readError } from '$lib/api/http-client';
import { mirrorStore } from '$lib/hooks/mirror-store/mirror-store.svelte';
import { COMPUTERS_QUERY_KEY } from '$lib/hooks/use-computer-list/use-computer-list.svelte';

export type ComputerDetailModel = {
  data: {
    computer: Computer | null;
    samples: ComputerSample[];
    alerts: ComputerAlert[];
    /**
     * O token recém-gerado, em texto puro. Existe só enquanto a tela estiver aberta: ele não
     * pode ser pedido de novo, e guardá-lo em algum lugar seria guardar uma credencial.
     */
    newToken: string | null;
  };
  state: {
    isLoading: boolean;
    isSamplesLoading: boolean;
    isAlertsLoading: boolean;
    /** A máquina não existe (ou foi apagada por fora): a tela diz isso, não fica em branco. */
    isMissing: boolean;
    isSaving: boolean;
    error: string | null;
    /** A falha de uma AÇÃO (arquivar, bloquear, gerar token), separada da falha de carregar. */
    actionError: string | null;
  };
  actions: {
    onArchivedChange: (isArchived: boolean) => void;
    onBlockedChange: (isBlocked: boolean, reason?: string) => void;
    onRegenerateToken: () => void;
    onDismissToken: () => void;
    onRetry: () => void;
  };
};

/**
 * A ficha de uma máquina: o cadastro, o uso das últimas horas e os episódios de alerta.
 *
 * As três consultas são SEPARADAS de propósito. O gráfico de uso e o histórico de alerta são
 * pesados e não mudam a decisão de quem só quer saber de quem é a máquina; buscando tudo
 * junto, a ficha inteira esperaria pela parte mais lenta para mostrar o nome do responsável.
 *
 * Editar a identificação não está aqui: tem view-model próprio (`use-computer-form`), porque
 * é formulário e formulário morre junto com o diálogo que o abriu.
 */
export function useComputerDetailModel(id: number): ComputerDetailModel {
  const queryClient = useQueryClient();

  const computer = mirrorStore(
    createQuery(
      writable({
        queryKey: [...COMPUTERS_QUERY_KEY, 'detail', id],
        queryFn: () => computersApi.findById(id),
      }),
    ),
  );

  const samples = mirrorStore(
    createQuery(
      writable({
        queryKey: [...COMPUTERS_QUERY_KEY, 'samples', id],
        queryFn: () => computersApi.samples(id),
      }),
    ),
  );

  const alerts = mirrorStore(
    createQuery(
      writable({
        queryKey: [...COMPUTERS_QUERY_KEY, 'alerts', id],
        queryFn: () => computersApi.alerts(id),
      }),
    ),
  );

  const save = mirrorStore(
    createMutation({
      mutationFn: (body: UpdateComputerInput) => computersApi.update(id, body),
      onSuccess: () => invalidate(queryClient),
    }),
  );

  /* O token novo mora numa store, e não em `$state`: ele nasce da resposta da mutação, que
     vive fora do componente. */
  const newToken = writable<string | null>(null);
  const token = mirrorStore(newToken);

  const regenerate = mirrorStore(
    createMutation({
      mutationFn: () => computersApi.regenerateToken(id),
      onSuccess: (created) => {
        newToken.set(created.token);

        return invalidate(queryClient);
      },
    }),
  );

  return {
    get data() {
      return {
        computer: computer.current.data ?? null,
        samples: samples.current.data ?? [],
        alerts: alerts.current.data ?? [],
        newToken: token.current,
      };
    },
    get state() {
      return buildDetailState({
        computer: computer.current,
        isSamplesLoading: samples.current.isPending,
        isAlertsLoading: alerts.current.isPending,
        isSaving: save.current.isPending || regenerate.current.isPending,
        actionError: readError(save.current.error) ?? readError(regenerate.current.error),
      });
    },
    actions: {
      onArchivedChange: (isArchived) => save.current.mutate({ isArchived }),
      /* Desbloquear limpa o motivo junto: um motivo pendurado numa máquina liberada faria a
         ficha contar uma história que já não é verdade. */
      onBlockedChange: (isBlocked, reason) =>
        save.current.mutate({ isBlocked, blockReason: isBlocked ? (reason ?? '') : '' }),
      onRegenerateToken: () => regenerate.current.mutate(),
      onDismissToken: () => newToken.set(null),
      onRetry: () => {
        void computer.current.refetch();
        void samples.current.refetch();
        void alerts.current.refetch();
      },
    },
  };
}

async function invalidate(queryClient: ReturnType<typeof useQueryClient>): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: COMPUTERS_QUERY_KEY });
}

type DetailQueryLike = {
  isPending: boolean;
  error: unknown;
  data: Computer | undefined;
};

/**
 * Separado do model porque cada `??` conta como decisão, e o hook passava do teto de
 * complexidade sem ter nenhuma decisão de verdade dentro.
 */
function buildDetailState(input: {
  computer: DetailQueryLike;
  isSamplesLoading: boolean;
  isAlertsLoading: boolean;
  isSaving: boolean;
  actionError: string | null;
}): ComputerDetailModel['state'] {
  const status = input.computer.error instanceof Error ? readStatus(input.computer.error) : null;

  return {
    isLoading: input.computer.isPending,
    isSamplesLoading: input.isSamplesLoading,
    isAlertsLoading: input.isAlertsLoading,
    /* 404 não é falha de sistema: é uma máquina que não existe mais. A tela diz isso com
       texto próprio, em vez de oferecer "tentar de novo" para algo que nunca vai dar certo. */
    isMissing: status === 404,
    isSaving: input.isSaving,
    error: status === 404 ? null : readError(input.computer.error),
    actionError: input.actionError,
  };
}

function readStatus(error: Error): number | null {
  if (!('status' in error)) return null;

  const { status } = error as { status?: unknown };

  return typeof status === 'number' ? status : null;
}
