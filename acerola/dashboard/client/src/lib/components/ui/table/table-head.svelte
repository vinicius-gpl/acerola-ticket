<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import type { HTMLThAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  let {
    class: className,
    ref = $bindable(null),
    children,
    ...restProps
  }: HTMLThAttributes & { ref?: HTMLTableCellElement | null; children?: Snippet } = $props();
</script>

<th
  bind:this={ref}
  data-slot="table-head"
  class={cn(
    "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
    className
  )}
  {...restProps}
>
  {@render children?.()}
</th>
