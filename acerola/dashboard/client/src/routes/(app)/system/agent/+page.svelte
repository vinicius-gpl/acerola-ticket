<script lang="ts">
  import AgentDownloadView from '$lib/components/acerola-agent-download-view/acerola-agent-download-view.svelte';
  import { useAgentDownloadModel } from '$lib/hooks/use-agent-download/use-agent-download.svelte';
  const model = useAgentDownloadModel();
</script>

<svelte:head><title>Agente Windows</title></svelte:head>
<AgentDownloadView data={model.data} state={model.state} actions={model.actions} />
