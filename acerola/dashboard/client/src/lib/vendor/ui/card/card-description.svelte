<script lang="ts">
  import { cn } from '$lib/utils/cn.util';
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
  data-slot="card-description"
  class={cn("text-sm text-muted-foreground", className)}
  {...restProps}
>
  {@render children?.()}
</div>
