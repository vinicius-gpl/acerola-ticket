<script lang="ts" module>
  import { type Maintenance } from '@template/shared/schemas/maintenance.schema';

  /**
   * A ponte entre a tela e o formulário de manutenção.
   *
   * Existe como componente separado, e dentro de `routes/`, por dois motivos: o view-model do
   * formulário precisa nascer junto com o diálogo (e morrer com ele), e componente de
   * `lib/components` não pode buscar o próprio dado — é a regra que o ESLint cobra ali.
   */
  export type MaintenanceFormSlotProps = {
    maintenance: Maintenance | null;
    /** Máquina já escolhida: é assim que o lembrete de preventiva abre o formulário. */
    computerId?: number | null;
    onClose: () => void;
  };
</script>

<script lang="ts">
  import MaintenanceFormDialog from '$lib/components/maintenance-form-dialog/maintenance-form-dialog.svelte';
  import { useMaintenanceFormModel } from '$lib/hooks/use-maintenance-form/use-maintenance-form.svelte';

  let { maintenance, computerId = null, onClose }: MaintenanceFormSlotProps = $props();

  /* O compilador avisa que isto lê as props uma vez só — e é exatamente o que se quer. O
     formulário fotografa o registro na montagem e não acompanha mudanças dele: quem troca de
     registro é o `{#key}` da rota, que monta este componente de novo. Acompanhar apagaria o
     que a pessoa está digitando quando a lista recarregasse por trás. */
  // svelte-ignore state_referenced_locally
  const form = useMaintenanceFormModel({ maintenance, computerId, onSaved: onClose });
</script>

<MaintenanceFormDialog
  data={form.data}
  state={{ ...form.state, isOpen: true }}
  actions={{
    ...form.actions,
    onClose: () => (form.state.isSubmitting ? undefined : onClose()),
  }}
/>
