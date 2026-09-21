<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  let {
    class: className,
    ref = $bindable(null),
    children,
    ...restProps
  }: HTMLAttributes<HTMLDivElement> & { ref?: HTMLDivElement | null; children?: Snippet } = $props();
</script>

<div
  bind:this={ref}
  data-slot="card-action"
  class={cn(
    "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
    className
  )}
  {...restProps}
>
  {@render children?.()}
</div>
