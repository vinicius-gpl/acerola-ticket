<script lang="ts">
  import type { ComponentProps } from 'svelte';

  import { TableRow } from '$lib/components/ui/table';
  import { cn } from '$lib/utils/cn';

  /* A linha: divisória mais leve que a borda de fora e nenhuma depois da última. */
  let { ref = $bindable(null), class: className, ...restProps }: ComponentProps<typeof TableRow> =
    $props();
</script>

<TableRow
  bind:ref
  class={cn(
    'border-border/60 hover:bg-muted/80 last:border-b-0',
    className,
  )}
  {...restProps}
/>
