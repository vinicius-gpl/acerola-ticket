<script lang="ts">
  import { untrack } from 'svelte';
  import { type InternalRole } from '@template/shared/schemas/internal-role.schema';
  import { ROLE_CONTEXT_LABELS } from '@template/shared/schemas/user.schema';

  import ConfirmDialog from '$lib/components/acerola-confirm-dialog/acerola-confirm-dialog.svelte';
  import RoleListView from '$lib/components/acerola-role-list-view/acerola-role-list-view.svelte';
  import { useRolesModel } from '$lib/hooks/use-roles/use-roles.svelte';
  import { useWhatsappLinkModel } from '$lib/hooks/use-whatsapp-link/use-whatsapp-link.svelte';
  import { useWhatsappTemplatesModel } from '$lib/hooks/use-whatsapp-templates/use-whatsapp-templates.svelte';
  import RoleFormSlot from '../roles/role-form-slot.svelte';
  import WhatsappLinkCard from './components/acerola-whatsapp-link-card/acerola-whatsapp-link-card.svelte';
  import WhatsappLinkDialog from './components/acerola-whatsapp-link-dialog/acerola-whatsapp-link-dialog.svelte';
  import WhatsappTemplatesDialog from './components/acerola-whatsapp-templates-dialog/acerola-whatsapp-templates-dialog.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const list = useRolesModel();
  /* `untrack`: o id de quem está logado não muda enquanto a tela está aberta. */
  const whatsapp = useWhatsappLinkModel(untrack(() => data.user?.id ?? ''));
  /* Os textos do bot são do super admin: para os demais o botão nem aparece. */
  const templates = useWhatsappTemplatesModel();
  const canEditTemplates = $derived(data.user?.role === 'superadmin');

  type FormTarget = { role: InternalRole | null } | null;
  let formTarget = $state<FormTarget>(null);
</script>

<svelte:head>
  <title>Meu Perfil e Cargos</title>
</svelte:head>

<RoleListView
  data={{
    ...list.data,
    currentUser: data.user
      ? {
          name: data.user.name,
          email: data.user.email,
          image: data.user.image,
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
>
  <!-- Só para quem pode vincular: os demais nem veem o cartão. -->
  {#snippet afterProfile()}
    {#if whatsapp.state.canLink}
      <WhatsappLinkCard
        data={{
          phone: whatsapp.data.phone,
          sentToday: whatsapp.data.sentToday,
          dailyLimit: whatsapp.data.dailyLimit,
        }}
        state={{
          isLoading: whatsapp.state.isLoading,
          isConfigured: whatsapp.state.isConfigured,
          linkState: whatsapp.state.linkState,
          error: whatsapp.state.error,
        }}
        actions={{
          onLink: whatsapp.actions.onOpen,
          onUnlink: whatsapp.actions.onAskUnlink,
          onEditTemplates: canEditTemplates ? templates.actions.onOpen : undefined,
        }}
      />
    {/if}
  {/snippet}
</RoleListView>

<WhatsappTemplatesDialog data={templates.data} state={templates.state} actions={templates.actions} />

<WhatsappLinkDialog
  data={{ qrImage: whatsapp.data.qrImage }}
  state={{
    step: whatsapp.state.step,
    secondsLeft: whatsapp.state.secondsLeft,
    isLinking: whatsapp.state.isLinking,
    error: whatsapp.state.linkError,
  }}
  actions={{ onConfirm: whatsapp.actions.onConfirmRisks, onClose: whatsapp.actions.onClose }}
/>

<ConfirmDialog
  data={{
    title: 'Desvincular seu WhatsApp?',
    description: `O número ${whatsapp.data.phone} deixa de enviar as mensagens dos chamados. Para voltar, será preciso ler o QR code de novo.`,
    confirmLabel: 'Desvincular',
    confirmingLabel: 'Desvinculando…',
  }}
  state={{
    isOpen: whatsapp.state.isUnlinkOpen,
    isConfirming: whatsapp.state.isUnlinking,
    error: whatsapp.state.unlinkError,
  }}
  actions={{
    onConfirm: whatsapp.actions.onConfirmUnlink,
    onCancel: whatsapp.actions.onCancelUnlink,
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
