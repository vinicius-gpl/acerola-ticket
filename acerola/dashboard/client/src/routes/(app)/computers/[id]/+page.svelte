<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import HardDrive from '@lucide/svelte/icons/hard-drive';

  import ActionButton from '$lib/components/action-button/action-button.svelte';
  import ComputerDetailView from '$lib/components/computer-detail-view/computer-detail-view.svelte';
  import ComputerTokenDialog from '$lib/components/computer-token-dialog/computer-token-dialog.svelte';
  import EmptyState from '$lib/components/empty-state/empty-state.svelte';
  import ErrorState from '$lib/components/error-state/error-state.svelte';
  import { useComputerDetailModel } from '$lib/hooks/use-computer-detail/use-computer-detail.svelte';
  import MaintenanceFormSlot from '../../maintenance/maintenance-form-slot.svelte';
  import ComputerFormSlot from '../computer-form-slot.svelte';
  import TransferFormSlot from './transfer-form-slot.svelte';

  /**
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   *
   * A ficha é uma ROTA, e não um modal sobre a lista, porque ela tem endereço próprio: o
   * pessoal do TI cola `/computers/3` num chamado para dizer "é desta máquina que estou
   * falando", e um modal não tem como ser apontado.
   */
  const id = Number(page.params.id);

  const detail = useComputerDetailModel(id);

  /* Qual peça está na frente — não é dado. */
  let isEditing = $state(false);
  let isRegisteringMaintenance = $state(false);
  let isTransferring = $state(false);
</script>

<svelte:head>
  <title>{detail.data.computer?.displayName ?? detail.data.computer?.name ?? 'Computador'}</title>
</svelte:head>

<!-- Estados na frente, conteúdo por último e sem aninhamento (CONTRIBUTING §2). -->
{#if detail.state.isMissing}
  <div class="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
    <EmptyState
      data={{
        title: 'Este computador não está mais no inventário',
        description: 'Ele pode ter sido removido do cadastro. Volte à lista para ver o parque.',
      }}
      ui={{ icon: HardDrive }}
    >
      <ActionButton
        data={{ label: 'Voltar ao inventário' }}
        actions={{ onClick: () => void goto('/computers') }}
      />
    </EmptyState>
  </div>
{:else if detail.state.error}
  <div class="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
    <ErrorState
      data={{ title: 'Não consegui abrir esta máquina', message: detail.state.error }}
      actions={{ onRetry: detail.actions.onRetry }}
    />
  </div>
{:else if detail.state.isLoading || !detail.data.computer}
  <p class="text-ink-500 py-16 text-center text-sm">Carregando a ficha da máquina…</p>
{:else}
  <ComputerDetailView
    data={{
      computer: detail.data.computer,
      samples: detail.data.samples,
      alerts: detail.data.alerts,
      maintenances: detail.data.maintenances,
      partMovements: detail.data.partMovements,
      transfers: detail.data.transfers,
    }}
    state={detail.state}
    actions={{
      ...detail.actions,
      onEdit: () => (isEditing = true),
      onRegisterMaintenance: () => (isRegisteringMaintenance = true),
      onTransfer: () => (isTransferring = true),
      onBack: () => void goto('/computers'),
    }}
  />
{/if}

<!-- `{#key}` pelo id: trocar de máquina monta um formulário NOVO, com os valores dela. -->
{#if isEditing && detail.data.computer}
  {#key detail.data.computer.id}
    <ComputerFormSlot
      computer={detail.data.computer}
      onSaved={() => (isEditing = false)}
      onClose={() => (isEditing = false)}
    />
  {/key}
{/if}

<!-- O formulário de manutenção é o MESMO da tela de Manutenção, só que já com esta máquina
     escolhida: dois formulários para o mesmo registro divergiriam no primeiro campo novo. -->
{#if isRegisteringMaintenance && detail.data.computer}
  <MaintenanceFormSlot
    maintenance={null}
    computerId={detail.data.computer.id}
    onClose={() => (isRegisteringMaintenance = false)}
  />
{/if}

<!-- `{#key}` pelo id: a transferência de outra máquina abre com as escolhas dela, zeradas. -->
{#if isTransferring && detail.data.computer}
  {#key detail.data.computer.id}
    <TransferFormSlot
      computer={detail.data.computer}
      onClose={() => (isTransferring = false)}
    />
  {/key}
{/if}

<!-- Token gerado de novo: aparece uma vez, e some quando a pessoa diz que guardou. -->
{#if detail.data.newToken && detail.data.computer}
  <ComputerTokenDialog
    data={{ computerName: detail.data.computer.name, token: detail.data.newToken }}
    actions={{ onClose: detail.actions.onDismissToken }}
  />
{/if}
