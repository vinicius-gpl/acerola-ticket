<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { untrack } from 'svelte';
  import {
    useSoftwareScheduleModel,
    type SoftwareScheduleModel,
  } from './use-software-schedule.svelte';
  let { onReady }: { onReady: (model: SoftwareScheduleModel) => void } = $props();
  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  const model = useSoftwareScheduleModel();
  untrack(() => onReady(model));
</script>

<p>{model.state.isLoading ? 'Carregando' : 'Pronto'}</p>
<p>{model.data.githubEvents.length}</p>
