<script lang="ts">
  import SystemKanbanView from './components/acerola-system-kanban-view/acerola-system-kanban-view.svelte';
  import { useSoftwareKanbanModel } from '$lib/hooks/use-software-kanban/use-software-kanban.svelte';

  const kanban = useSoftwareKanbanModel();
</script>

<svelte:head>
  <title>Kanban de Sistema</title>
</svelte:head>

<SystemKanbanView
  data={kanban.data}
  state={kanban.state}
  actions={kanban.actions}
/>
