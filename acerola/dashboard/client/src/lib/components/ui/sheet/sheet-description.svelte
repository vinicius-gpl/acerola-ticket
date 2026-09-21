<script lang="ts">
  import { cn } from '$lib/utils/cn.util';
  import { Dialog as SheetPrimitive } from 'bits-ui';
  import type { Snippet } from 'svelte';

  let {
    class: className,
    ref = $bindable(null),
    children,
    ...restProps
  }: SheetPrimitive.DescriptionProps & { children?: Snippet } = $props();
</script>

<SheetPrimitive.Description
  bind:ref
  data-slot="sheet-description"
  class={cn("text-sm text-muted-foreground", className)}
  {...restProps}
>
  {@render children?.()}
</SheetPrimitive.Description>
