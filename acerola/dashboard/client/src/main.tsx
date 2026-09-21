import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import AppErrorBoundary from '$lib/components/app-error-boundary/app-error-boundary.svelte';
import { routeTree } from './routeTree.gen';
import '$lib/theme/tokens.css';

/**
 * A WEB NÃO GUARDA SESSÃO, e não manda identidade.
 *
 * O template não tem login: a identidade é decidida no servidor (hoje, a pessoa fixa do mock;
 * depois, o proxy de auth-forward). Nada de token no `localStorage` — num escritório de
 * máquinas compartilhadas, a próxima pessoa a abrir o sistema herdaria a conta da anterior.
 */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /* Tentar de novo sozinho esconde a falha por segundos e faz a tela mentir enquanto
         isso. Quando falha, a pessoa precisa ver — em vermelho, com o motivo. */
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
    mutations: {
      /* Numa gravação isso pesa mais: repetir um "criar" que falhou por tempo esgotado
         criaria o registro duas vezes. */
      retry: false,
    },
  },
});

const router = createRouter({ routeTree, defaultPreload: 'intent' });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element to mount the application.');

createRoot(container).render(
  <StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
