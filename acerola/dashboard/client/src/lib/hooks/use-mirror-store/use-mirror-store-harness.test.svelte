<script lang="ts">
  /**
   * O `mirrorStore` usa `onDestroy`, que só existe dentro de um componente. Este casulo
   * existe para dar um a ele — o mesmo recurso dos demais testes de hook.
   */
  import { type Readable } from 'svelte/store';

  import { mirrorStore } from './use-mirror-store.svelte';

  let {
    store,
    onReady,
  }: {
    store: Readable<unknown>;
    onReady: (mirror: { readonly current: unknown }) => void;
  } = $props();

  onReady(mirrorStore(store));
</script>
