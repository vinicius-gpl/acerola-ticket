<script lang="ts">
  import type { ComponentProps } from 'svelte';

  import { TableFooter } from '$lib/components/ui/table';
  import { cn } from '$lib/utils/cn';

  /* O `<tfoot>`, para totais em linha de tabela. O rodapé com a fonte do dado e a contagem é o
     snippet `footer` do `acerola-table`, não este. */
  let { ref = $bindable(null), class: className, ...restProps }: ComponentProps<typeof TableFooter> =
    $props();
</script>

<TableFooter
  bind:ref
  class={cn(
    'border-border/80 bg-muted/40 text-ink-500 px-6 py-3 text-xs font-normal',
    className,
  )}
  {...restProps}
/>
