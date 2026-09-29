<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  let {
    class: className,
    ref = $bindable(null),
    children,
    ...restProps
  }: HTMLAttributes<HTMLTableSectionElement> & { ref?: HTMLTableSectionElement | null; children?: Snippet } = $props();
</script>

<thead
  bind:this={ref}
  data-slot="table-header"
  class={cn(
    "border-b border-border/80 bg-neutral-50/70 text-[11px] font-semibold uppercase tracking-widest text-neutral-400 dark:bg-neutral-800/40",
    className
  )}
  {...restProps}
>
  {@render children?.()}
</thead>
