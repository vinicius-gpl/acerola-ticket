<script lang="ts">
  import { Tooltip as TooltipPrimitive } from 'bits-ui';
  import type { Snippet } from 'svelte';

  let {
    open = $bindable(false),
    children,
    ...restProps
  }: TooltipPrimitive.RootProps & { children?: Snippet } = $props();
</script>

<TooltipPrimitive.Root bind:open data-slot="tooltip" {...restProps}>
  {@render children?.()}
</TooltipPrimitive.Root>
