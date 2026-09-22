<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { type SessionUser } from '@template/shared/schemas/user.schema';

  import { useAppShellModel, type AppShellModel } from './use-app-shell.svelte';

  /**
   * O hook usa `useQueryClient()` (para `onLogout` limpar o cache) — só existe dentro de um
   * componente, com um `QueryClient` no contexto. Este apoio monta o model e o entrega ao
   * teste, do mesmo jeito que `use-task-list-harness.test.svelte`.
   */
  let { user, onReady }: { user: SessionUser; onReady: (model: AppShellModel) => void } =
    $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  onReady(useAppShellModel({ user }));
</script>
