<script lang="ts">
  import { cn } from '$lib/utils/cn.util';
  import { Select as SelectPrimitive } from 'bits-ui';
  import type { Snippet } from 'svelte';

  let {
    class: className,
    ref = $bindable(null),
    children,
    ...restProps
  }: SelectPrimitive.GroupHeadingProps & { children?: Snippet } = $props();
</script>

<SelectPrimitive.GroupHeading
  bind:ref
  data-slot="select-label"
  class={cn("px-2 py-1.5 text-xs text-muted-foreground", className)}
  {...restProps}
>
  {@render children?.()}
</SelectPrimitive.GroupHeading>
