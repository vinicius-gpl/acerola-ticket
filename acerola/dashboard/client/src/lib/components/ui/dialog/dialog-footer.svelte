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
  data-slot="dialog-footer"
  class={cn(
    "flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-end pt-3 border-t border-border/60",
    className
  )}
  {...restProps}
>
  {@render children?.()}
</div>
