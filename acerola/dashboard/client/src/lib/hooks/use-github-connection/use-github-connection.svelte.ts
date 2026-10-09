import { goto } from '$app/navigation';
import { page } from '$app/state';
import { createMutation, createQuery } from '@tanstack/svelte-query';
import { writable } from 'svelte/store';
import { githubIntegrationApi } from '$lib/api/github-integration.api';
import { readError } from '$lib/api/http-client';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';

export function useGithubConnectionModel(userId: string, enabled = true) {
  const query = mirrorStore(
    createQuery(
      writable({
        queryKey: ['github-connection', userId],
        enabled,
        queryFn: githubIntegrationApi.status,
        staleTime: 0,
        retry: false,
        refetchOnWindowFocus: true,
        refetchInterval: 60_000,
      }),
    ),
  );
  const mutation = mirrorStore(
    createMutation({
      mutationFn: githubIntegrationApi.authorize,
      onSuccess: ({ url }) => window.location.assign(url),
    }),
  );
  return {
    get state() {
      const callbackError = page.url.searchParams.get('github_error');
      const callbackMessage =
        callbackError === 'cancelled'
          ? 'A autorização foi cancelada. Vincule sua conta para continuar.'
          : callbackError
            ? 'Não foi possível concluir a vinculação. Tente novamente.'
            : null;
      return {
        isLoading: query.current.isPending,
        isLinked: Boolean(query.current.data?.isLinked) && !query.current.isError,
        isConfigured: Boolean(query.current.data?.isConfigured),
        isConnecting: mutation.current.isPending,
        error:
          readError(mutation.current.error) ?? readError(query.current.error) ?? callbackMessage,
      };
    },
    actions: {
      onConnect: () => {
        if (!mutation.current.isPending) mutation.current.mutate();
      },
      onRetry: () => {
        mutation.current.reset();
        void query.current.refetch();
      },
      onLeave: () => void goto('/profile'),
    },
  };
}
