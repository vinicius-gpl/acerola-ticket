<script lang="ts">
  import { Tooltip as TooltipPrimitive } from 'bits-ui';
  import type { Snippet } from 'svelte';

  let {
    ref = $bindable(null),
    children,
    ...restProps
  }: TooltipPrimitive.TriggerProps & { children?: Snippet } = $props();
</script>

<TooltipPrimitive.Trigger bind:ref data-slot="tooltip-trigger" {...restProps}>
  {@render children?.()}
</TooltipPrimitive.Trigger>
