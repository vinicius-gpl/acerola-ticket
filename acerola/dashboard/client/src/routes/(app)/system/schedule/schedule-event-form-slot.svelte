<script lang="ts">
  import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
  import { type SoftwareScheduleEvent } from '@template/shared/schemas/software-schedule.schema';

  import { useSoftwareScheduleFormModel } from '$lib/hooks/use-software-schedule-form/use-software-schedule-form.svelte';
  import ScheduleEventDialog from './components/acerola-schedule-event-dialog/acerola-schedule-event-dialog.svelte';

  let {
    event = null,
    defaultDate,
    projects = [],
    onDelete,
    onClose,
  }: {
    event: SoftwareScheduleEvent | null;
    defaultDate?: string;
    projects?: SoftwareProject[];
    onDelete?: () => void;
    onClose: () => void;
  } = $props();

  const model = useSoftwareScheduleFormModel({
    event,
    defaultDate,
    onSaved: onClose,
  });
</script>

<ScheduleEventDialog
  open={true}
  {model}
  {projects}
  {onDelete}
  {onClose}
/>
