import { createQuery } from '@tanstack/svelte-query';
import { type SoftwareTimelineEvent } from '@template/shared/schemas/software-timeline.schema';
import { writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { softwareTimelineApi } from '$lib/api/software-timeline.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';

export const SOFTWARE_TIMELINE_QUERY_KEY = ['software-timeline'] as const;

export type SoftwareTimelineModel = {
  data: {
    items: SoftwareTimelineEvent[];
  };
  state: {
    isLoading: boolean;
    error: string | null;
  };
};

export function useSoftwareTimelineModel(projectId: number): SoftwareTimelineModel {
  const query = mirrorStore(
    createQuery(
      writable({
        queryKey: [...SOFTWARE_TIMELINE_QUERY_KEY, projectId],
        queryFn: () => softwareTimelineApi.list({ projectId, pageSize: 50 }),
      }),
    ),
  );

  return {
    get data() {
      return {
        items: query.current.data?.items ?? [],
      };
    },
    get state() {
      return {
        isLoading: query.current.isPending,
        error: query.current.error ? readError(query.current.error) : null,
      };
    },
  };
}
