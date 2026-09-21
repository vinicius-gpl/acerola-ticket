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
    "flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm",
    className
  )}
  {...restProps}
>
  {@render children?.()}
</div>
