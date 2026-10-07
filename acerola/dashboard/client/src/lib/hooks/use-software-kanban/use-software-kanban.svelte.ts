import { goto } from '$app/navigation';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
import { type Ticket } from '@template/shared/schemas/ticket.schema';
import { type ManualTicketHistoryType } from '@template/shared/domain/ticket-history.util';
import { type TicketStatus } from '@template/shared/domain/ticket-status.util';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import { derived, writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { softwareProjectsApi } from '$lib/api/software-projects.api';
import { ticketsApi } from '$lib/api/tickets.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { TICKETS_QUERY_KEY } from '$lib/hooks/use-ticket-list/use-ticket-list.svelte';
import { contextPath } from '$lib/navigation/navigation';

export type KanbanColumnId = 'todo' | 'in_progress' | 'waiting' | 'done';

export type KanbanColumn = {
  id: KanbanColumnId;
  title: string;
  tickets: Ticket[];
};

export const KANBAN_CARD_COLORS = [
  'blue',
  'emerald',
  'purple',
  'amber',
  'rose',
  'cyan',
  'red',
  'neutral',
] as const;

export type KanbanCardColor = (typeof KANBAN_CARD_COLORS)[number];

const COLOR_STORAGE_KEY = 'acerola_kanban_card_colors';

function loadStoredColors(): Record<number, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(COLOR_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<number, string>) : {};
  } catch {
    return {};
  }
}

function saveStoredColors(colors: Record<number, string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COLOR_STORAGE_KEY, JSON.stringify(colors));
  } catch {
    /* ignore storage errors */
  }
}

export type SoftwareKanbanModel = {
  data: {
    columns: KanbanColumn[];
    projects: SoftwareProject[];
    selectedProjectId: number | null;
    totalTickets: number;
    cardColors: Record<number, string>;
  };
  state: {
    isLoading: boolean;
    isRefetching: boolean;
    isEmpty: boolean;
    isMoving: boolean;
    error: string | null;
    moveError: string | null;
  };
  actions: {
    onSelectProject: (projectId: number | null) => void;
    onRetry: () => void;
    onOpenTicket: (ticketId: number) => void;
    onMoveTicket: (ticketId: number, targetColumn: KanbanColumnId) => Promise<void>;
    onSetCardColor: (ticketId: number, color: string) => void;
    onClearMoveError: () => void;
  };
};

function getTicketColumn(status: TicketStatus): KanbanColumnId {
  if (status === 'open') return 'todo';
  if (status === 'in_progress') return 'in_progress';
  if (status === 'waiting_requester' || status === 'waiting_third_party') return 'waiting';
  return 'done';
}

export function useSoftwareKanbanModel(): SoftwareKanbanModel {
  const queryClient = useQueryClient();
  const selectedProject = writable<number | null>(null);
  const cardColorsStore = writable<Record<number, string>>(loadStoredColors());
  const optimisticStatuses = writable<Record<number, TicketStatus>>({});
  const moveErrorStore = writable<string | null>(null);

  const projectsQuery = mirrorStore(
    createQuery(
      writable({
        queryKey: ['software-projects', 'all'],
        queryFn: () => softwareProjectsApi.list({ page: 1, pageSize: 100 }),
      }),
    ),
  );

  const ticketsQueryParams = derived(selectedProject, ($selected) => ({
    page: 1,
    pageSize: MAX_PAGE_SIZE,
    area: 'sistema' as const,
    projectId: $selected ?? undefined,
  }));

  const ticketsQuery = mirrorStore(
    createQuery(
      derived(ticketsQueryParams, ($params) => ({
        queryKey: [...TICKETS_QUERY_KEY, 'kanban', $params],
        queryFn: () => ticketsApi.list($params),
      })),
    ),
  );

  const moveMutation = mirrorStore(
    createMutation({
      mutationFn: async ({
        ticketId,
        historyType,
        description,
      }: {
        ticketId: number;
        historyType: ManualTicketHistoryType;
        description: string;
      }) => {
        return ticketsApi.createHistory(
          ticketId,
          {
            type: historyType,
            description,
            isVisibleToRequester: true,
            minutesSpent: '0',
          },
          [],
        );
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
        moveErrorStore.set(null);
      },
    }),
  );

  const selectedStore = mirrorStore(selectedProject);
  const colorsMirror = mirrorStore(cardColorsStore);
  const optimisticMirror = mirrorStore(optimisticStatuses);
  const moveErrorMirror = mirrorStore(moveErrorStore);

  return {
    get data() {
      const allTickets = ticketsQuery.current.data?.items ?? [];
      const projects = projectsQuery.current.data?.items ?? [];
      const overrides = optimisticMirror.current;

      const ticketsWithOptimism = allTickets.map((t) => {
        const effectiveStatus = overrides[t.id] ?? t.status;
        return effectiveStatus === t.status ? t : { ...t, status: effectiveStatus };
      });

      const todoTickets = ticketsWithOptimism.filter((t) => t.status === 'open');
      const inProgressTickets = ticketsWithOptimism.filter((t) => t.status === 'in_progress');
      const waitingTickets = ticketsWithOptimism.filter(
        (t) => t.status === 'waiting_requester' || t.status === 'waiting_third_party',
      );
      const doneTickets = ticketsWithOptimism.filter(
        (t) =>
          t.status === 'resolved' ||
          t.status === 'resolved_with_caveats' ||
          t.status === 'cancelled',
      );

      const columns: KanbanColumn[] = [
        { id: 'todo', title: 'A Fazer / Triagem', tickets: todoTickets },
        { id: 'in_progress', title: 'Em Atendimento', tickets: inProgressTickets },
        { id: 'waiting', title: 'Aguardando', tickets: waitingTickets },
        { id: 'done', title: 'Concluído', tickets: doneTickets },
      ];

      return {
        columns,
        projects,
        selectedProjectId: selectedStore.current,
        totalTickets: ticketsWithOptimism.length,
        cardColors: colorsMirror.current,
      };
    },
    get state() {
      const allTickets = ticketsQuery.current.data?.items ?? [];
      return {
        isLoading: ticketsQuery.current.isPending || projectsQuery.current.isPending,
        isRefetching: ticketsQuery.current.isRefetching,
        isEmpty: allTickets.length === 0,
        isMoving: moveMutation.current.isPending,
        error: readError(ticketsQuery.current.error) ?? readError(projectsQuery.current.error),
        moveError: moveErrorMirror.current,
      };
    },
    actions: {
      onSelectProject: (id) => selectedProject.set(id),
      onRetry: () => {
        moveErrorStore.set(null);
        void ticketsQuery.current.refetch();
        void projectsQuery.current.refetch();
      },
      onClearMoveError: () => moveErrorStore.set(null),
      onOpenTicket: (ticketId) => void goto(contextPath('sistema', `/tickets/${ticketId}`)),
      onMoveTicket: async (ticketId, targetColumn) => {
        if (moveMutation.current.isPending) return;
        const allTickets = ticketsQuery.current.data?.items ?? [];
        const ticket = allTickets.find((t) => t.id === ticketId);
        if (!ticket) return;

        const currentEffectiveStatus = optimisticMirror.current[ticketId] ?? ticket.status;
        const currentColumn = getTicketColumn(currentEffectiveStatus);

        // Se já está na mesma coluna, é no-op imediato
        if (currentColumn === targetColumn) return;

        // Nenhum histórico leva um chamado de volta a "Aberto": a fila só se alcança na abertura.
        if (targetColumn === 'todo') {
          moveErrorStore.set(
            'Um chamado já iniciado não volta para "A Fazer". Para pausá-lo, mova para "Aguardando Usuário".',
          );
          return;
        }

        let historyType: ManualTicketHistoryType = 'note';
        let desc = 'Atualizado pelo Kanban de desenvolvimento.';
        let targetStatus: TicketStatus = currentEffectiveStatus;

        const isClosed =
          currentEffectiveStatus === 'resolved' ||
          currentEffectiveStatus === 'resolved_with_caveats' ||
          currentEffectiveStatus === 'cancelled';

        if (isClosed) {
          if (targetColumn === 'waiting') {
            moveErrorStore.set(
              'Reabra o chamado movendo-o para "Em Atendimento" antes de colocá-lo em espera.',
            );
            return;
          }
          // Chamados encerrados no domínio precisam ser reabertos para movimentar
          if (targetColumn === 'done') return; // Já está encerrado

          historyType = 'reopening';
          targetStatus = 'in_progress';
          desc = 'Reaberto via Kanban.';
        } else {
          if (targetColumn === 'in_progress') {
            if (
              currentEffectiveStatus === 'waiting_requester' ||
              currentEffectiveStatus === 'waiting_third_party'
            ) {
              historyType = 'resume';
              targetStatus = 'in_progress';
              desc = 'Retomado o atendimento via Kanban.';
            } else if (currentEffectiveStatus === 'open') {
              historyType = 'start';
              targetStatus = 'in_progress';
              desc = 'Iniciado atendimento via Kanban.';
            } else {
              historyType = 'resume';
              targetStatus = 'in_progress';
              desc = 'Movido para em atendimento via Kanban.';
            }
          } else if (targetColumn === 'waiting') {
            historyType = 'waiting_requester';
            targetStatus = 'waiting_requester';
            desc = 'Movido para aguardando usuário/solicitante via Kanban.';
          } else if (targetColumn === 'done') {
            historyType = 'resolution';
            targetStatus = 'resolved';
            desc = 'Concluído via Kanban.';
          }
        }

        // Aplica atualização otimista imediata
        optimisticStatuses.update((prev) => ({ ...prev, [ticketId]: targetStatus }));
        moveErrorStore.set(null);

        try {
          await moveMutation.current.mutateAsync({ ticketId, historyType, description: desc });
          // Limpa o override uma vez que a query invalidou
          optimisticStatuses.update((prev) => {
            const next = { ...prev };
            delete next[ticketId];
            return next;
          });
        } catch (err) {
          // Em caso de falha, reverte a otimismo e exibe mensagem amigável sem quebrar o Kanban
          optimisticStatuses.update((prev) => {
            const next = { ...prev };
            delete next[ticketId];
            return next;
          });
          moveErrorStore.set(
            readError(err) || 'Não foi possível movimentar o chamado. Verifique as permissões.',
          );
        }
      },
      onSetCardColor: (ticketId, color) => {
        cardColorsStore.update((prev) => {
          const next = { ...prev, [ticketId]: color };
          saveStoredColors(next);
          return next;
        });
      },
    },
  };
}
