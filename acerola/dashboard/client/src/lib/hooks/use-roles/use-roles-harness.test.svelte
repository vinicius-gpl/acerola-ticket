<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';

  import { useRolesModel, type RolesModel } from './use-roles.svelte';

  let { onReady }: { onReady: (model: RolesModel) => void } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  onReady(useRolesModel());
</script>
