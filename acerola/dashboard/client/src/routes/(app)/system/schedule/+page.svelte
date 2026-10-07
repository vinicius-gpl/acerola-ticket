<script lang="ts">
  import { type SoftwareScheduleEvent } from '@template/shared/schemas/software-schedule.schema';

  import WeekScheduleGrid from './components/acerola-week-schedule-grid/acerola-week-schedule-grid.svelte';
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
  state={schedule.state}
  actions={{
    ...schedule.actions,
    onNewEvent: () => (isNewOpen = true),
    onSelectEvent: (event) => (selectedEvent = event),
  }}
/>

{#if isNewOpen}
  <ScheduleEventFormSlot
    event={null}
    projects={schedule.data.projects}
    onClose={() => (isNewOpen = false)}
  />
{/if}

{#if selectedEvent}
  {#key selectedEvent.id}
    <ScheduleEventFormSlot
      event={selectedEvent}
      projects={schedule.data.projects}
      onDelete={() => {
        schedule.actions.onDeleteEvent(selectedEvent!.id);
        selectedEvent = null;
      }}
      onClose={() => (selectedEvent = null)}
    />
  {/key}
{/if}
