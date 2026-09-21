<script lang="ts">
  import { cn } from '$lib/utils/cn.util';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    class: className,
    ref = $bindable(null),
    ...restProps
  }: HTMLAttributes<HTMLDivElement> & { ref?: HTMLDivElement | null } = $props();
</script>

<div
  bind:this={ref}
  data-slot="skeleton"
  class={cn("animate-pulse rounded-md bg-accent", className)}
  {...restProps}
></div>
