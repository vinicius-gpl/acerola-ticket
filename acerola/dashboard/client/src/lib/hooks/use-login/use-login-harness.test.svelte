<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import { useLoginModel, type LoginModel } from './use-login.svelte';

  /** Mesmo apoio dos demais view-models: o model precisa de um componente para existir. */
  let {
    onReady,
    returnTo,
  }: { onReady: (model: LoginModel) => void; returnTo?: string } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { mutations: { retry: false } } }));

  // svelte-ignore state_referenced_locally
  onReady(useLoginModel({ returnTo }));
</script>
