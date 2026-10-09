<script lang="ts">
  import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';

  import { useSoftwareTimelineModel } from '$lib/hooks/use-software-timeline/use-software-timeline.svelte';
  import ProjectTimelineDialog from './components/acerola-project-timeline-dialog/acerola-project-timeline-dialog.svelte';

  let {
    project,
    onClose,
  }: {
    project: SoftwareProject;
    onClose: () => void;
  } = $props();

  const model = useSoftwareTimelineModel(project.id);
</script>

<ProjectTimelineDialog
  data={{
    project,
    items: model.data.items,
  }}
  state={{
    isOpen: true,
    isLoading: model.state.isLoading,
    error: model.state.error,
  }}
  actions={{
    onClose,
  }}
/>
