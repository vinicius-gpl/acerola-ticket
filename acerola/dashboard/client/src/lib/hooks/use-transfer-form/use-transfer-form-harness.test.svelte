<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { type Computer } from '@template/shared/schemas/computer.schema';

  import { useTransferFormModel, type TransferFormModel } from './use-transfer-form.svelte';

  /**
   * View-model com consulta só existe dentro de um componente: é dali que vêm o QueryClient e
   * o ciclo de vida da busca. Este apoio monta o model e o entrega ao teste.
   */
  let {
    computer,
    onReady,
    onSaved = () => {},
  }: {
    computer: Computer;
    onReady: (model: TransferFormModel) => void;
    onSaved?: () => void;
  } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  onReady(useTransferFormModel({ computer, onSaved }));
</script>
