<script lang="ts">
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import type { Snippet } from 'svelte';

  import AppErrorBoundary from '$lib/components/app-error-boundary/app-error-boundary.svelte';
  import '$lib/theme/tokens.css';

  /**
   * A WEB NÃO GUARDA SESSÃO, e não manda identidade.
   *
   * A sessão do login próprio é um cookie `HttpOnly` — o JavaScript da tela nem consegue lê-lo,
   * então não há nada aqui para guardar ou mandar. Nada de token no `localStorage`: num
   * escritório de máquinas compartilhadas, a próxima pessoa a abrir o sistema herdaria a conta
   * da anterior.
   *
   * A casca (menu lateral) NÃO mora aqui: ela é de `routes/(app)/+layout.svelte`, que também
   * exige sessão válida. Este layout raiz vale para a tela de login também, então só tem o que
   * toda tela precisa — cliente de dados e captura de erro.
   */
  let { children }: { children: Snippet } = $props();

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
</script>

<AppErrorBoundary>
  <QueryClientProvider client={queryClient}>
    {@render children()}
  </QueryClientProvider>
</AppErrorBoundary>
