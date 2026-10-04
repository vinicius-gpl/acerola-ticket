<script lang="ts">
  /**
   * A moldura recebe `children`, e um snippet não se passa por `props` num teste. Este
   * casulo existe só para dar um filho a ela — é o mesmo recurso usado nos testes dos hooks.
   */
  import ChartFrame from '$lib/components/acerola-chart-frame/acerola-chart-frame.svelte';
  import type { ChartConfig } from '$lib/utils/chart-config';

  let { config }: { config: ChartConfig } = $props();
</script>

<ChartFrame data={{ config }}>
  <span data-testid="desenho">desenho</span>
</ChartFrame>
