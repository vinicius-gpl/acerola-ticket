<script lang="ts">
  import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';

  import { useSoftwareProjectFormModel } from '$lib/hooks/use-software-project-form/use-software-project-form.svelte';
  import ProjectFormDialog from './components/acerola-project-form-dialog/acerola-project-form-dialog.svelte';

  let {
    project = null,
    onClose,
  }: {
    project: SoftwareProject | null;
    onClose: () => void;
  } = $props();

  const model = useSoftwareProjectFormModel({
    project,
    onSaved: onClose,
  });
</script>

<ProjectFormDialog
  open={true}
  {model}
  {onClose}
/>
