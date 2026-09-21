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
    "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
    className
  )}
  {...restProps}
>
  {@render children?.()}
</tr>
