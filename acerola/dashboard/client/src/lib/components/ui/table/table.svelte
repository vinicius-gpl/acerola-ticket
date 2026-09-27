<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import type { HTMLTableAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  let {
    class: className,
    containerClass,
    ref = $bindable(null),
    footer,
    children,
    ...restProps
  }: HTMLTableAttributes & {
    ref?: HTMLTableElement | null;
    containerClass?: string;
    footer?: Snippet;
    children?: Snippet;
  } = $props();
</script>

<div
  data-slot="table-container"
  class={cn("w-full overflow-hidden rounded-2xl border border-border bg-card shadow-xs", containerClass)}
>
  <div class="relative w-full overflow-x-auto">
    <table
      bind:this={ref}
      data-slot="table"
      class={cn("w-full caption-bottom text-sm text-left", className)}
      {...restProps}
    >
      {@render children?.()}
    </table>
  </div>
  {#if footer}
    <div class="flex items-center justify-between border-t border-border/80 bg-neutral-50/40 px-6 py-3 text-xs text-neutral-400 dark:bg-neutral-800/20">
      {@render footer()}
    </div>
  {/if}
</div>
