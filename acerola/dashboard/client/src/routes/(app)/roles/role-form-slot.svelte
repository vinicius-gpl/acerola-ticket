<script lang="ts" module>
  import { type InternalRole } from '@template/shared/schemas/internal-role.schema';

  export type RoleFormSlotProps = {
    role: InternalRole | null;
    onClose: () => void;
  };
</script>

<script lang="ts">
  import RoleFormDialog from '$lib/components/role-form-dialog/role-form-dialog.svelte';
  import { useRoleFormModel } from '$lib/hooks/use-role-form/use-role-form.svelte';

  let { role, onClose }: RoleFormSlotProps = $props();

  // svelte-ignore state_referenced_locally
  const form = useRoleFormModel({ role, onSaved: onClose });
</script>

<RoleFormDialog
  data={form.data}
  state={{ ...form.state, isOpen: true }}
  actions={{
    ...form.actions,
    onClose: () => (form.state.isSubmitting ? undefined : onClose()),
  }}
/>
