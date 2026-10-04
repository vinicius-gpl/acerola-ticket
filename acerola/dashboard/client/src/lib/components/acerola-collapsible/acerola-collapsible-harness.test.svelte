<script lang="ts">
  /**
   * O conteúdo do `AcerolaCollapsible` entra por `children`, que é um snippet — e snippet só
   * se escreve dentro de um componente. Este casulo dá um conteúdo fixo para o teste procurar.
   */
  import AcerolaCollapsible, { type AcerolaCollapsibleProps } from './acerola-collapsible.svelte';

  let props: Omit<AcerolaCollapsibleProps, 'children'> = $props();
</script>

<AcerolaCollapsible {...props}>
  <p data-testid="conteudo">Setor, responsável e período.</p>
</AcerolaCollapsible>
