<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  let {
    class: className,
    ref = $bindable(null),
    children,
    ...restProps
  }: HTMLAttributes<HTMLTableSectionElement> & { ref?: HTMLTableSectionElement | null; children?: Snippet } = $props();
</script>

<tfoot
  bind:this={ref}
  data-slot="table-footer"
  class={cn(
    "border-t border-border/80 bg-neutral-50/40 px-6 py-3 text-xs text-neutral-400 dark:bg-neutral-800/20 font-normal [&>tr]:last:border-b-0",
    className
  )}
  {...restProps}
>
  {@render children?.()}
</tfoot>
