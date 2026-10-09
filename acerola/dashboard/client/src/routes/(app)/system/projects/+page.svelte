<script lang="ts">
  import { page } from '$app/state';
  import { canEditSystem } from '@template/shared/domain/system-access.util';
  import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';

  import { useSoftwareProjectListModel } from '$lib/hooks/use-software-project-list/use-software-project-list.svelte';
  import ProjectListView from './components/acerola-project-list-view/acerola-project-list-view.svelte';
  import ProjectFormSlot from './project-form-slot.svelte';
  import ProjectTimelineSlot from './project-timeline-slot.svelte';

  const listModel = useSoftwareProjectListModel();

  let isFormOpen = $state(false);
  let editingProject = $state<SoftwareProject | null>(null);
  let timelineProject = $state<SoftwareProject | null>(null);

  function handleRegister() {
    editingProject = null;
    isFormOpen = true;
  }

  function handleEdit(project: SoftwareProject) {
    editingProject = project;
    isFormOpen = true;
  }

  function handleCloseForm() {
    isFormOpen = false;
    editingProject = null;
  }
</script>

<svelte:head>
  <title>Sistemas e Projetos</title>
</svelte:head>

<ProjectListView
  data={listModel.data}
  state={{ ...listModel.state, canEdit: canEditSystem(page.data.user) }}
  actions={{
    ...listModel.actions,
    onRegister: handleRegister,
    onEdit: handleEdit,
    onViewTimeline: (project) => {
      timelineProject = project;
    },
  }}
/>

{#if isFormOpen}
  <ProjectFormSlot project={editingProject} onClose={handleCloseForm} />
{/if}

{#if timelineProject}
  {#key timelineProject.id}
    <ProjectTimelineSlot
      project={timelineProject}
      onClose={() => {
        timelineProject = null;
      }}
    />
  {/key}
{/if}
