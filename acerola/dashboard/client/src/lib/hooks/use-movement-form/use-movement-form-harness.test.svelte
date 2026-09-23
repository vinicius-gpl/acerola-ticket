<script lang="ts">
  import { QueryClient, setQueryClientContext } from '@tanstack/svelte-query';
  import { type MovementType } from '@template/shared/domain/part-catalog.util';
  import { type Part } from '@template/shared/schemas/part.schema';

  import { useMovementFormModel, type MovementFormModel } from './use-movement-form.svelte';

  /** Mesma razão do apoio da lista: o model precisa de um componente para existir. */
  let {
    part,
    type = 'out',
    onSaved = () => {},
    onReady,
  }: {
    part: Part;
    type?: MovementType;
    onSaved?: () => void;
    onReady: (model: MovementFormModel) => void;
  } = $props();

  setQueryClientContext(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  // svelte-ignore state_referenced_locally
  onReady(useMovementFormModel({ part, type, onSaved }));
</script>
