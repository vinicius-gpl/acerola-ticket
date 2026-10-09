<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import ScheduleEventDialog from './acerola-schedule-event-dialog.svelte';
  import { type SoftwareScheduleFormModel } from '$lib/hooks/use-software-schedule-form/use-software-schedule-form.svelte';

  const mockModel: SoftwareScheduleFormModel = {
    data: {
      mode: 'create',
      fields: {
        title: { value: 'Deploy Portal v2', error: null },
        category: { value: 'deploy', error: null },
        color: { value: 'blue', error: null },
        date: { value: '2026-10-18', error: null },
        startTime: { value: '09:00', error: null },
        endTime: { value: '10:00', error: null },
        projectId: { value: '', error: null },
        note: { value: '', error: null },
      },
    },
    state: {
      isSubmitting: false,
      error: null,
    },
    actions: {
      onChange: fn(),
      onBlur: fn(),
      onSubmit: fn(),
    },
  };

  const { Story } = defineMeta({
    title: 'Features/System/AcerolaScheduleEventDialog',
    component: ScheduleEventDialog,
  });
</script>

<Story
  name="Create"
  args={{
    open: true,
    model: mockModel,
    projects: [],
    onClose: fn(),
  }}
/>
