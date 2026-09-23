<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { type Part } from '@template/shared/schemas/part.schema';

  import { usePartFormModel, type PartFormModel } from './use-part-form.svelte';

  /** Mesma razão do apoio da lista: o model precisa de um componente para existir. */
  let {
    part = null,
    onSaved = () => {},
    onReady,
  }: {
    part?: Part | null;
    onSaved?: () => void;
    onReady: (model: PartFormModel) => void;
  } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  // svelte-ignore state_referenced_locally
  onReady(usePartFormModel({ part, onSaved }));
</script>
