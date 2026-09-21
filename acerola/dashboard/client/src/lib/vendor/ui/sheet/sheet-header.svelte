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
  data-slot="sheet-header"
  class={cn("flex flex-col gap-1.5 p-4", className)}
  {...restProps}
>
  {@render children?.()}
</div>
