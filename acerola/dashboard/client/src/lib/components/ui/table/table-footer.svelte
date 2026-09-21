<script lang="ts">
  import { cn } from '$lib/utils/cn.util';
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
    "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
    className
  )}
  {...restProps}
>
  {@render children?.()}
</tfoot>
