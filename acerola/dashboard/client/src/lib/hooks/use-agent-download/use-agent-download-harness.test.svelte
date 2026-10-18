<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { useAgentDownloadModel, type AgentDownloadModel } from './use-agent-download.svelte';
  let { onReady }: { onReady: (model: AgentDownloadModel) => void } = $props();
  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  // svelte-ignore state_referenced_locally
  onReady(useAgentDownloadModel());
</script>
