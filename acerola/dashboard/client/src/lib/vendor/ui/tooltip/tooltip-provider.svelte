<script lang="ts">
  import { Tooltip as TooltipPrimitive } from 'bits-ui';
  import type { Snippet } from 'svelte';

  let {
    delayDuration = 0,
    children,
    ...restProps
  }: TooltipPrimitive.ProviderProps & { children?: Snippet } = $props();
</script>

<TooltipPrimitive.Provider {delayDuration} {...restProps}>
  {@render children?.()}
</TooltipPrimitive.Provider>
