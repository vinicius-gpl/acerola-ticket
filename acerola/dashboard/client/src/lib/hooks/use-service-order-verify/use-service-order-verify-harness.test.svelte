<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import {
    useServiceOrderVerifyModel,
    type ServiceOrderVerifyModel,
  } from './use-service-order-verify.svelte';

  /** Mesmo apoio dos demais view-models: o model precisa de um componente para existir. */
  let {
    reference,
    onReady,
  }: { reference: string; onReady: (model: ServiceOrderVerifyModel) => void } = $props();

  setQueryClientContext(
    new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    }),
  );

  // svelte-ignore state_referenced_locally
  onReady(useServiceOrderVerifyModel(reference));
</script>
