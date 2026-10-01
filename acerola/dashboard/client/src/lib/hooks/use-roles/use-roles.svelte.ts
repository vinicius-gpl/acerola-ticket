import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { type InternalRole } from '@template/shared/schemas/internal-role.schema';
import { type RoleContext } from '@template/shared/schemas/user.schema';
import { writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { rolesApi } from '$lib/api/roles.api';
import { mirrorStore } from '$lib/hooks/mirror-store/mirror-store.svelte';

export type RolesFilter = {
  search: string;
  context: RoleContext | '';
};

export type RolesModel = {
  data: {
    roles: InternalRole[];
    total: number;
    filter: RolesFilter;
    pendingDelete: InternalRole | null;
  };
  state: {
    isLoading: boolean;
    isRefetching: boolean;
    isEmpty: boolean;
    isFilteredOut: boolean;
    error: string | null;
    isDeleting: boolean;
    deleteError: string | null;
  };
  actions: {
    onSearchChange: (search: string) => void;
    onContextChange: (context: RoleContext | '') => void;
    onClearFilters: () => void;
    onRetry: () => void;
    onAskDelete: (role: InternalRole) => void;
    onCancelDelete: () => void;
    onConfirmDelete: () => void;
  };
};

const EMPTY_FILTER: RolesFilter = { search: '', context: '' };

export const ROLES_QUERY_KEY = ['roles'] as const;

export function useRolesModel(): RolesModel {
  const queryClient = useQueryClient();

  const filterStore = writable<RolesFilter>({ ...EMPTY_FILTER });
  const filter = mirrorStore(filterStore);

  let pendingDelete = $state<InternalRole | null>(null);

  const list = mirrorStore(
    createQuery({
      queryKey: [...ROLES_QUERY_KEY, 'list'],
      queryFn: () => rolesApi.list(),
    }),
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });

  const remove = mirrorStore(
    createMutation({
      mutationFn: (role: InternalRole) => rolesApi.remove(role.id),
      onSuccess: async () => {
        pendingDelete = null;
        await invalidate();
      },
    }),
  );

  return {
    get data() {
      const allRoles = list.current.data ?? [];
      const currentFilter = filter.current;
      const searchLower = currentFilter.search.trim().toLowerCase();

      const filtered = allRoles.filter((item) => {
        if (currentFilter.context && item.context !== currentFilter.context) {
          return false;
        }
        if (searchLower) {
          const matchUser = item.userId.toLowerCase().includes(searchLower);
          const matchEmail = item.userEmail?.toLowerCase().includes(searchLower) ?? false;
          if (!matchUser && !matchEmail) return false;
        }
        return true;
      });

      return {
        roles: filtered,
        total: allRoles.length,
        filter: currentFilter,
        pendingDelete,
      };
    },
    get state() {
      const allRoles = list.current.data ?? [];
      const isDataEmpty = !list.current.isPending && allRoles.length === 0;
      const filteredCount = this.data.roles.length;
      const isFilteredEmpty = !list.current.isPending && allRoles.length > 0 && filteredCount === 0;

      return {
        isLoading: list.current.isPending,
        isRefetching: list.current.isFetching && !list.current.isPending,
        isEmpty: isDataEmpty,
        isFilteredOut: isFilteredEmpty,
        error: readError(list.current.error),
        isDeleting: remove.current.isPending,
        deleteError: readError(remove.current.error),
      };
    },
    actions: {
      onSearchChange: (search) => filterStore.update((c) => ({ ...c, search })),
      onContextChange: (context) => filterStore.update((c) => ({ ...c, context })),
      onClearFilters: () => filterStore.set({ ...EMPTY_FILTER }),
      onRetry: () => void list.current.refetch(),
      onAskDelete: (role) => {
        remove.current.reset();
        pendingDelete = role;
      },
      onCancelDelete: () => {
        if (remove.current.isPending) return;
        pendingDelete = null;
      },
      onConfirmDelete: () => {
        if (!pendingDelete) return;
        remove.current.mutate(pendingDelete);
      },
    },
  };
}
