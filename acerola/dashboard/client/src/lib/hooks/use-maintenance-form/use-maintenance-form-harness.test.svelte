<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { type Maintenance } from '@template/shared/schemas/maintenance.schema';

  import { useMaintenanceFormModel, type MaintenanceFormModel } from './use-maintenance-form.svelte';

  /**
   * View-model de formulário com mutação só existe dentro de um componente. Este apoio monta
   * o model e o entrega ao teste, que trabalha com ele como o diálogo trabalharia.
   */
  let {
    maintenance = null,
    computerId = null,
    onSaved = () => {},
    onReady,
  }: {
    maintenance?: Maintenance | null;
    computerId?: number | null;
    onSaved?: () => void;
    onReady: (model: MaintenanceFormModel) => void;
  } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  // svelte-ignore state_referenced_locally
  onReady(useMaintenanceFormModel({ maintenance, computerId, onSaved }));
</script>
