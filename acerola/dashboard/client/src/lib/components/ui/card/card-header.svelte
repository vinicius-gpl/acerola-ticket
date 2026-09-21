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
  data-slot="card-header"
  class={cn(
    "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
    className
  )}
  {...restProps}
>
  {@render children?.()}
</div>
