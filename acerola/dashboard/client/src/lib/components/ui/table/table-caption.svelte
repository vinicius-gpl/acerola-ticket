<script lang="ts">
  import { cn } from '$lib/utils/cn.util';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { Snippet } from 'svelte';

  let {
    class: className,
    ref = $bindable(null),
    children,
    ...restProps
  }: HTMLAttributes<HTMLElement> & { ref?: HTMLElement | null; children?: Snippet } = $props();
</script>

<caption
  bind:this={ref}
  data-slot="table-caption"
  class={cn("mt-4 text-sm text-muted-foreground", className)}
  {...restProps}
>
  {@render children?.()}
</caption>
