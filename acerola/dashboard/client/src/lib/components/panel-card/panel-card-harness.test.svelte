<script lang="ts">
  /**
   * O cartão recebe `children` e, às vezes, `tools` — nenhum dos dois se passa por `props`
   * num teste. Este casulo existe só para fornecê-los.
   */
  import PanelCard from '$lib/components/panel-card/panel-card.svelte';

  let {
    title,
    hint,
    hasTools = false,
  }: { title: string; hint?: string | null; hasTools?: boolean } = $props();
</script>

<PanelCard data={{ title, hint }}>
  {#snippet tools()}
    {#if hasTools}
      <button type="button">Mês</button>
    {/if}
  {/snippet}
  <p data-testid="conteudo">o conteúdo do bloco</p>
</PanelCard>
