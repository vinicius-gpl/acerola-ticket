<script lang="ts">
  /**
   * A fileira de cartões do topo do painel.
   *
   * Existe como componente, e não como uma `class` repetida em cada tela, porque o número de
   * colunas é uma decisão de leitura, não de layout: quatro cartões por linha é o limite do
   * que se compara de relance, e abaixo disso a fileira vira uma lista que ninguém varre.
   * Repetida à mão, essa decisão se perde na primeira tela nova.
   */
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils/cn';

  let {
    ui,
    children,
  }: {
    ui?: { className?: string };
    children?: Snippet;
  } = $props();
</script>

<div class={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4', ui?.className)}>
  {@render children?.()}
</div>
