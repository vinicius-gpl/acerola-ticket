<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { type SessionUser } from '@template/shared/schemas/user.schema';

  import { type AreaContext } from '$lib/hooks/use-area-context/use-area-context.svelte';
  import { type NavItem } from '$lib/navigation/navigation';
  import { useAppShellModel, type AppShellModel } from './use-app-shell.svelte';

  /**
   * O hook usa `useQueryClient()` (para `onLogout` limpar o cache) — só existe dentro de um
   * componente, com um `QueryClient` no contexto. Este apoio monta o model e o entrega ao
   * teste, do mesmo jeito que `use-task-list-harness.test.svelte`.
   *
   * `context` e `items` chegam como chegam de verdade: do layout do módulo.
   */
  let {
    user,
    context,
    items,
    onReady,
  }: {
    user: SessionUser;
    context: AreaContext;
    items: readonly NavItem[];
    onReady: (model: AppShellModel) => void;
  } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  onReady(useAppShellModel({ user, context, items }));
</script>
