<script lang="ts" module>
  import type { Snippet } from 'svelte';

  /**
   * Casca de uma lista de etapas (usar com `TimelineStep`).
   *
   * Troca "um monte de campo solto" por uma narrativa: cada etapa aparece na ordem em que
   * acontece, com um ícone e uma linha ligando à próxima — como o histórico de um chamado, não
   * como um formulário de cadastro.
   */
  export type TimelineProps = {
    ui?: { className?: string };
    children: Snippet;
  };
</script>

<script lang="ts">
  import { cn } from '$lib/utils/cn';

  let { ui, children }: TimelineProps = $props();
</script>

<div class={cn('flex flex-col', ui?.className)}>
  {@render children()}
</div>
