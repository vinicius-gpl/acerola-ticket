<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import { useLoginModel, type LoginModel } from './use-login.svelte';

  /** Mesmo apoio dos demais view-models: o model precisa de um componente para existir. */
  let { onReady }: { onReady: (model: LoginModel) => void } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { mutations: { retry: false } } }));

  onReady(useLoginModel());
</script>
