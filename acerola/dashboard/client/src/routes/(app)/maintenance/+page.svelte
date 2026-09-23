<script lang="ts">
  import { type Maintenance } from '@template/shared/schemas/maintenance.schema';

  import MaintenanceListView from '$lib/components/maintenance-list-view/maintenance-list-view.svelte';
  import { useMaintenanceListModel } from '$lib/hooks/use-maintenance-list/use-maintenance-list.svelte';
  import MaintenanceFormSlot from './maintenance-form-slot.svelte';

  /**
   * A rota só compõe: chama o model e entrega para a view (CONTRIBUTING §3).
   *
   * O que mora aqui não é dado, é QUAL PEÇA DA TELA ESTÁ NA FRENTE: o formulário, e com qual
   * registro (ou com qual máquina já escolhida, quando ele foi aberto por um lembrete de
   * preventiva).
   */
  const list = useMaintenanceListModel();

  type FormTarget = { maintenance: Maintenance | null; computerId: number | null };

  let form = $state<FormTarget | null>(null);
</script>

<svelte:head>
  <title>Manutenção</title>
</svelte:head>

<MaintenanceListView
  data={list.data}
  state={list.state}
  actions={{
    ...list.actions,
    onRegister: (computerId?: number) =>
      (form = { maintenance: null, computerId: computerId ?? null }),
    onEdit: (maintenance: Maintenance) => (form = { maintenance, computerId: null }),
  }}
/>

<!-- `{#key}` pelo registro: trocar de manutenção monta um formulário NOVO, com os valores
     dela. -->
{#if form}
  {#key form.maintenance?.id ?? `new-${form.computerId ?? 'any'}`}
    <MaintenanceFormSlot
      maintenance={form.maintenance}
      computerId={form.computerId}
      onClose={() => (form = null)}
    />
  {/key}
{/if}
