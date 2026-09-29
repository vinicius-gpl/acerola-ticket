<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  let {
    class: className,
    ref = $bindable(null),
    children,
    ...restProps
  }: HTMLAttributes<HTMLTableRowElement> & { ref?: HTMLTableRowElement | null; children?: Snippet } = $props();
</script>

<tr
  bind:this={ref}
  data-slot="table-row"
  class={cn(
    "border-b border-border/60 transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/30 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted last:border-b-0",
    className
  )}
  {...restProps}
>
  {@render children?.()}
</tr>
