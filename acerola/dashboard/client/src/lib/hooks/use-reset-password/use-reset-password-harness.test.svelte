<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import { useResetPasswordModel, type ResetPasswordModel } from './use-reset-password.svelte';

  /** Mesmo motivo do apoio de `use-forgot-password`: `createMutation` precisa de contexto. */
  let { onReady }: { onReady: (model: ResetPasswordModel) => void } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { mutations: { retry: false } } }));

  onReady(useResetPasswordModel());
</script>
