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
  data-slot="card"
  class={cn(
    "flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-xs",
    className
  )}
  {...restProps}
>
  {@render children?.()}
</div>
