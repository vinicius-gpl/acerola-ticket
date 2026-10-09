import { createQuery } from '@tanstack/svelte-query';
import { type SoftwareTimelineEvent } from '@template/shared/schemas/software-timeline.schema';
import { derived, writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { softwareTimelineApi } from '$lib/api/software-timeline.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';

export const SOFTWARE_TIMELINE_QUERY_KEY = ['software-timeline'] as const;

export type SoftwareTimelineModel = {
  data: {
    items: SoftwareTimelineEvent[];
    page: number;
    totalPages: number;
  };
  actions: { onPageChange: (page: number) => void };
  state: {
    isLoading: boolean;
    error: string | null;
  };
};

export function useSoftwareTimelineModel(projectId: number): SoftwareTimelineModel {
  const pageStore = writable(1);
  const page = mirrorStore(pageStore);
  const pageSize = 25;
  const query = mirrorStore(
    createQuery(
      derived(pageStore, (currentPage) => ({
        queryKey: [...SOFTWARE_TIMELINE_QUERY_KEY, projectId, currentPage],
        queryFn: () => softwareTimelineApi.list({ projectId, pageSize, page: currentPage }),
      })),
    ),
  );

  return {
    get data() {
      return {
        items: query.current.data?.items ?? [],
        page: page.current,
        totalPages: Math.max(1, Math.ceil((query.current.data?.total ?? 0) / pageSize)),
      };
    },
    actions: { onPageChange: (nextPage) => pageStore.set(nextPage) },
    get state() {
      return {
        isLoading: query.current.isPending,
        error: query.current.error ? readError(query.current.error) : null,
      };
    },
  };
}
