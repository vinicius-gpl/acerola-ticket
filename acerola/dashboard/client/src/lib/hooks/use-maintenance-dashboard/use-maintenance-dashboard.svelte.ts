import { goto } from '$app/navigation';
import { createQuery } from '@tanstack/svelte-query';
import { type MaintenanceDashboard } from '@template/shared/schemas/maintenance-dashboard.schema';
import { writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { maintenanceDashboardApi } from '$lib/api/maintenance-dashboard.api';
import { ticketsApi } from '$lib/api/tickets.api';
import { MAINTENANCE_DASHBOARD_QUERY_KEY } from '$lib/hooks/use-inventory-movement-form/use-inventory-movement-form.svelte';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { TICKETS_QUERY_KEY } from '$lib/hooks/use-ticket-list/use-ticket-list.svelte';
import { contextPath } from '$lib/navigation/navigation';

/** Os chamados da Manutenção que ainda pedem alguma coisa de alguém. */
export type MaintenanceTicketCounts = { open: number; inProgress: number; waiting: number };

export type MaintenanceDashboardModel = {
  data: {
    summary: MaintenanceDashboard | null;
    /** Nulo enquanto não chegou — ou quando falhou: o painel segue sem esse cartão. */
    tickets: MaintenanceTicketCounts | null;
  };
  state: {
    isLoading: boolean;
    isRefetching: boolean;
    isTicketsLoading: boolean;
    error: string | null;
  };
  actions: {
    onRetry: () => void;
    onOpenTickets: () => void;
    onOpenStock: () => void;
    onOpenQuotes: () => void;
    onOpenDisposal: () => void;
  };
};

/**
 * O que o painel da Manutenção mostra: o resumo do que é dela (inventário, depósito,
 * orçamentos) e os chamados da área.
 *
 * São DUAS consultas de propósito. Os chamados vêm dos indicadores que a fila já tem — e com
 * a MESMA chave de consulta dela — para o número do painel e o da fila nunca discordarem. E a
 * falha de uma não derruba a outra: sem os chamados, o painel ainda mostra o depósito.
 *
 * Os cartões são atalhos: clicar em "Sem estoque" leva ao Depósito. O `goto` mora aqui, e
 * não no componente (CONTRIBUTING §3) — navegação é decisão do hook.
 */
export function useMaintenanceDashboardModel(): MaintenanceDashboardModel {
  const summary = mirrorStore(
    createQuery(
      writable({
        queryKey: [...MAINTENANCE_DASHBOARD_QUERY_KEY],
        queryFn: () => maintenanceDashboardApi.summary(),
      }),
    ),
  );

  const tickets = mirrorStore(
    createQuery(
      writable({
        queryKey: [...TICKETS_QUERY_KEY, 'dashboard', 'manutencao'],
        queryFn: () => ticketsApi.dashboard('manutencao'),
      }),
    ),
  );

  return {
    /* `get` em vez de valor: o objeto é montado uma vez e a tela lê dele a cada mudança. */
    get data() {
      const counts = tickets.current.data;

      return {
        summary: summary.current.data ?? null,
        tickets: counts
          ? { open: counts.open, inProgress: counts.inProgress, waiting: counts.waiting }
          : null,
      };
    },
    get state() {
      return {
        isLoading: summary.current.isPending,
        isRefetching: summary.current.isRefetching,
        isTicketsLoading: tickets.current.isPending,
        error: readError(summary.current.error),
      };
    },
    actions: {
      onRetry: () => {
        void summary.current.refetch();
        void tickets.current.refetch();
      },
      onOpenTickets: () => void goto(contextPath('manutencao', '/tickets')),
      onOpenStock: () => void goto(contextPath('manutencao', '/stock')),
      onOpenQuotes: () => void goto(contextPath('manutencao', '/quotes')),
      onOpenDisposal: () => void goto(contextPath('manutencao', '/disposal')),
    },
  };
}
