<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { type Computer } from '@template/shared/schemas/computer.schema';

  import {
    useComputerFormModel,
    type ComputerFormModel,
    type CreatedAgentToken,
  } from './use-computer-form.svelte';

  /**
   * View-model de formulário com mutação só existe dentro de um componente. Este apoio monta
   * o model e o entrega ao teste, que trabalha com ele como o diálogo trabalharia.
   */
  let {
    computer = null,
    onSaved = () => {},
    onReady,
  }: {
    computer?: Computer | null;
    onSaved?: (created: CreatedAgentToken | null) => void;
    onReady: (model: ComputerFormModel) => void;
  } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  // svelte-ignore state_referenced_locally
  onReady(useComputerFormModel({ computer, onSaved }));
</script>
