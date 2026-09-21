<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import type { HTMLTableAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  let {
    class: className,
    ref = $bindable(null),
    children,
    ...restProps
  }: HTMLTableAttributes & { ref?: HTMLTableElement | null; children?: Snippet } = $props();
</script>

<div
  data-slot="table-container"
  class="relative w-full overflow-x-auto"
>
  <table
    bind:this={ref}
    data-slot="table"
    class={cn("w-full caption-bottom text-sm", className)}
    {...restProps}
  >
    {@render children?.()}
  </table>
</div>
