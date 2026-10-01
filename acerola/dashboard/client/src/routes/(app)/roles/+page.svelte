<script lang="ts">
  import { type InternalRole } from '@template/shared/schemas/internal-role.schema';
  import { ROLE_CONTEXT_LABELS } from '@template/shared/schemas/user.schema';

  import ConfirmDialog from '$lib/components/confirm-dialog/confirm-dialog.svelte';
  import RoleListView from '$lib/components/role-list-view/role-list-view.svelte';
  import { useRolesModel } from '$lib/hooks/use-roles/use-roles.svelte';
  import RoleFormSlot from './role-form-slot.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const list = useRolesModel();

  type FormTarget = { role: InternalRole | null } | null;

  let formTarget = $state<FormTarget>(null);
</script>

<svelte:head>
  <title>Cargos Internos</title>
</svelte:head>

<RoleListView
  data={{
    ...list.data,
    currentUser: data.user
      ? {
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          roles: data.user.roles,
        }
      : undefined,
  }}
  state={list.state}
  actions={{
    ...list.actions,
    onCreate: () => (formTarget = { role: null }),
    onEdit: (role: InternalRole) => (formTarget = { role }),
  }}
/>

{#if formTarget}
  {#key formTarget.role?.id ?? 'new'}
    <RoleFormSlot role={formTarget.role} onClose={() => (formTarget = null)} />
  {/key}
{/if}

<ConfirmDialog
  data={{
    title: 'Excluir este cargo interno?',
    description: `O cargo de "${list.data.pendingDelete?.userEmail || list.data.pendingDelete?.userId || ''}" no contexto "${list.data.pendingDelete ? ROLE_CONTEXT_LABELS[list.data.pendingDelete.context] : ''}" será removido, voltando ao perfil restrito padrão.`,
    confirmLabel: 'Excluir cargo',
    confirmingLabel: 'Excluindo…',
  }}
  state={{
    isOpen: list.data.pendingDelete !== null,
    isConfirming: list.state.isDeleting,
    error: list.state.deleteError,
  }}
  actions={{ onConfirm: list.actions.onConfirmDelete, onCancel: list.actions.onCancelDelete }}
/>
