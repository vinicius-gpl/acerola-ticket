<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import type { HTMLTdAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  let {
    class: className,
    ref = $bindable(null),
    children,
    ...restProps
  }: HTMLTdAttributes & { ref?: HTMLTableCellElement | null; children?: Snippet } = $props();
</script>

<td
  bind:this={ref}
  data-slot="table-cell"
  class={cn(
    "px-6 py-3.5 align-middle text-sm [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
    className
  )}
  {...restProps}
>
  {@render children?.()}
</td>
