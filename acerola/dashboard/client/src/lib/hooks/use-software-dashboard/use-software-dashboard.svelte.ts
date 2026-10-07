import { goto } from '$app/navigation';
import { createQuery } from '@tanstack/svelte-query';
import { type SoftwareDashboard } from '@template/shared/schemas/software-dashboard.schema';
import { writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { softwareDashboardApi } from '$lib/api/software-dashboard.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';
import { contextPath } from '$lib/navigation/navigation';

export const SOFTWARE_DASHBOARD_QUERY_KEY = ['software-dashboard'] as const;

export type SoftwareDashboardModel = {
  data: {
    summary: SoftwareDashboard | null;
  };
  state: {
    isLoading: boolean;
    isRefetching: boolean;
    error: string | null;
  };
  actions: {
    onRetry: () => void;
    onOpenTickets: () => void;
    onOpenKanban: () => void;
    onOpenSchedule: () => void;
    onOpenProjects: () => void;
  };
};

export function useSoftwareDashboardModel(): SoftwareDashboardModel {
  const summary = mirrorStore(
    createQuery(
      writable({
        queryKey: [...SOFTWARE_DASHBOARD_QUERY_KEY],
        queryFn: () => softwareDashboardApi.summary(),
      }),
    ),
  );

  return {
    get data() {
      return {
        summary: summary.current.data ?? null,
      };
    },
    get state() {
      return {
        isLoading: summary.current.isPending,
        isRefetching: summary.current.isRefetching,
        error: readError(summary.current.error),
      };
    },
    actions: {
      onRetry: () => {
        void summary.current.refetch();
      },
      onOpenTickets: () => void goto(contextPath('sistema', '/tickets')),
      onOpenKanban: () => void goto(contextPath('sistema', '/kanban')),
      onOpenSchedule: () => void goto(contextPath('sistema', '/schedule')),
      onOpenProjects: () => void goto(contextPath('sistema', '/projects')),
    },
  };
}
