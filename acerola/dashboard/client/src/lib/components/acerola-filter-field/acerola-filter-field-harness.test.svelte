<script lang="ts">
  /**
   * O controle do `AcerolaFilterField` entra por `children`, que é um snippet — e snippet só se
   * escreve dentro de um componente. Este casulo põe um controle fixo para o teste procurar.
   */
  import AcerolaFilterField from './acerola-filter-field.svelte';

  let { label, className, isEmpty = false }: { label: string; className?: string; isEmpty?: boolean } =
    $props();
</script>

{#if isEmpty}
  <AcerolaFilterField data={{ label }} ui={{ className }} />
{:else}
  <AcerolaFilterField data={{ label }} ui={{ className }}>
    <button type="button">Todas</button>
  </AcerolaFilterField>
{/if}
