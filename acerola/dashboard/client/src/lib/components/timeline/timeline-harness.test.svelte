<script lang="ts">
  /**
   * A casca recebe `children`, e um snippet não se passa por `props` num teste. Este casulo
   * existe só para dar etapas a ela — é o mesmo recurso usado nos testes dos hooks.
   */
  import Timeline from '$lib/components/timeline/timeline.svelte';

  let { className }: { className?: string } = $props();
</script>

<Timeline ui={{ className }}>
  <span data-testid="etapa">Primeira etapa</span>
  <span data-testid="etapa">Segunda etapa</span>
</Timeline>
