<script lang="ts">
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import type { Snippet } from 'svelte';

  import AppErrorBoundary from '$lib/components/app-error-boundary/app-error-boundary.svelte';
  import AppShell from '$lib/components/app-shell/app-shell.svelte';
  import { useAppShellModel } from '$lib/hooks/use-app-shell/use-app-shell';
  import '$lib/theme/tokens.css';

  /**
   * A WEB NÃO GUARDA SESSÃO, e não manda identidade.
   *
   * O template não tem login: a identidade é decidida no servidor (hoje, a pessoa fixa do
   * mock; depois, o proxy de auth-forward). Nada de token no `localStorage` — num escritório
   * de máquinas compartilhadas, a próxima pessoa a abrir o sistema herdaria a conta da
   * anterior.
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

  const shell = useAppShellModel();
</script>

<AppErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <AppShell data={shell.data} state={shell.state}>
      {@render children()}
    </AppShell>
  </QueryClientProvider>
</AppErrorBoundary>
