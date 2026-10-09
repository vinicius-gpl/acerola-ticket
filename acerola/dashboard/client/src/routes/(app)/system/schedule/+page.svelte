<script lang="ts">
  import { page } from '$app/state';
  import { canEditSystem } from '@template/shared/domain/system-access.util';
  import { type SoftwareScheduleEvent } from '@template/shared/schemas/software-schedule.schema';

  import WeekScheduleGrid from './components/acerola-week-schedule-grid/acerola-week-schedule-grid.svelte';
  import GithubDayDialog from './components/acerola-github-day-dialog/acerola-github-day-dialog.svelte';
  import { useSoftwareScheduleModel } from '$lib/hooks/use-software-schedule/use-software-schedule.svelte';
  import ScheduleEventFormSlot from './schedule-event-form-slot.svelte';

  const schedule = useSoftwareScheduleModel();

  let selectedEvent = $state<SoftwareScheduleEvent | null>(null);
  let isNewOpen = $state(false);
</script>

<svelte:head>
  <title>Cronograma Semanal de Sistemas</title>
</svelte:head>

<WeekScheduleGrid
  data={schedule.data}
  state={{ ...schedule.state, canEdit: canEditSystem(page.data.user) }}
  actions={{
    ...schedule.actions,
    onNewEvent: () => {
      if (canEditSystem(page.data.user)) isNewOpen = true;
    },
    onSelectEvent: (event) => {
      if (canEditSystem(page.data.user)) selectedEvent = event;
    },
  }}
/>

{#if schedule.data.githubDay}
  <GithubDayDialog
    data={schedule.data.githubDay}
    actions={{
      onClose: schedule.actions.onCloseGithubDay,
      onPageChange: schedule.actions.onGithubDayPageChange,
    }}
  />
{/if}

{#if isNewOpen}
  <ScheduleEventFormSlot
    event={null}
    defaultDate={schedule.data.currentDate.toLocaleDateString('sv-SE')}
    projects={schedule.data.projects}
    onClose={() => (isNewOpen = false)}
  />
{/if}

{#if selectedEvent}
  {#key selectedEvent.id}
    <ScheduleEventFormSlot
      event={selectedEvent}
      projects={schedule.data.projects}
      onDelete={async () => {
        const id = selectedEvent?.id;
        if (id && (await schedule.actions.onDeleteEvent(id))) selectedEvent = null;
      }}
      deleteError={schedule.state.deleteError}
      isDeleting={schedule.state.isDeleting}
      onClose={() => (selectedEvent = null)}
    />
  {/key}
{/if}
