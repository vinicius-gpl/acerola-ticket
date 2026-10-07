import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { type SoftwareProjectStatus } from '@template/shared/domain/software-project.util';
import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
import { MAX_PAGE_SIZE } from '@template/shared/schemas/pagination.schema';
import { derived, writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { softwareProjectsApi } from '$lib/api/software-projects.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';

export type SoftwareProjectListFilter = {
  search: string;
  status: SoftwareProjectStatus | '';
};

export type SoftwareProjectListModel = {
  data: {
    items: SoftwareProject[];
    total: number;
    filter: SoftwareProjectListFilter;
    deleting: SoftwareProject | null;
  };
  state: {
    isLoading: boolean;
    isRefetching: boolean;
    isEmpty: boolean;
    isFilteredOut: boolean;
    isDeleting: boolean;
    isSyncing: boolean;
    error: string | null;
    deleteError: string | null;
    syncMessage: string | null;
    syncError: string | null;
  };
  actions: {
    onSearchChange: (search: string) => void;
    onStatusChange: (status: SoftwareProjectStatus | '') => void;
    onClearFilters: () => void;
    onRetry: () => void;
    onAskDelete: (item: SoftwareProject) => void;
    onCancelDelete: () => void;
    onConfirmDelete: () => void;
    onSyncGithub: (id: number) => void;
  };
};

export const SOFTWARE_PROJECTS_QUERY_KEY = ['software-projects'] as const;

export function useSoftwareProjectListModel(): SoftwareProjectListModel {
  const queryClient = useQueryClient();
  const filter = writable<SoftwareProjectListFilter>({ search: '', status: '' });
  const deleting = writable<SoftwareProject | null>(null);
  const syncMessage = writable<string | null>(null);

  const queryParams = derived(filter, ($filter) => ({
    page: 1,
    pageSize: MAX_PAGE_SIZE,
    search: $filter.search.trim() || undefined,
    status: $filter.status || undefined,
  }));

  const query = mirrorStore(
    createQuery(
      derived(queryParams, ($params) => ({
        queryKey: [...SOFTWARE_PROJECTS_QUERY_KEY, $params],
        queryFn: () => softwareProjectsApi.list($params),
      })),
    ),
  );

  const deleteMutation = mirrorStore(
    createMutation({
      mutationFn: (id: number) => softwareProjectsApi.remove(id),
      onSuccess: () => {
        deleting.set(null);
        void queryClient.invalidateQueries({ queryKey: SOFTWARE_PROJECTS_QUERY_KEY });
      },
    }),
  );

  const syncMutation = mirrorStore(
    createMutation({
      mutationFn: (id: number) => softwareProjectsApi.syncGithub(id),
      onSuccess: (data) => {
        syncMessage.set(data.message);
        setTimeout(() => syncMessage.set(null), 5000);
        void queryClient.invalidateQueries({ queryKey: SOFTWARE_PROJECTS_QUERY_KEY });
      },
    }),
  );

  const filterStore = mirrorStore(filter);
  const deletingStore = mirrorStore(deleting);
  const syncMessageStore = mirrorStore(syncMessage);

  return {
    get data() {
      const items = query.current.data?.items ?? [];
      const total = query.current.data?.total ?? 0;
      return {
        items,
        total,
        filter: filterStore.current,
        deleting: deletingStore.current,
      };
    },
    get state() {
      const total = query.current.data?.total ?? 0;
      const isFiltered = Boolean(filterStore.current.search || filterStore.current.status);

      return {
        isLoading: query.current.isPending,
        isRefetching: query.current.isRefetching,
        isEmpty: total === 0 && !isFiltered,
        isFilteredOut: total === 0 && isFiltered,
        isDeleting: deleteMutation.current.isPending,
        isSyncing: syncMutation.current.isPending,
        error: readError(query.current.error),
        deleteError: readError(deleteMutation.current.error),
        syncMessage: syncMessageStore.current,
        syncError: readError(syncMutation.current.error),
      };
    },
    actions: {
      onSearchChange: (search) => filter.update((f) => ({ ...f, search })),
      onStatusChange: (status) => filter.update((f) => ({ ...f, status })),
      onClearFilters: () => filter.set({ search: '', status: '' }),
      onRetry: () => void query.current.refetch(),
      onAskDelete: (item) => {
        deleteMutation.current.reset();
        deleting.set(item);
      },
      onCancelDelete: () => {
        if (!deleteMutation.current.isPending) deleting.set(null);
      },
      onConfirmDelete: () => {
        const item = deletingStore.current;
        if (item && !deleteMutation.current.isPending) void deleteMutation.current.mutate(item.id);
      },
      onSyncGithub: (id) => {
        if (syncMutation.current.isPending) return;
        syncMessage.set(null);
        syncMutation.current.mutate(id);
      },
    },
  };
}
