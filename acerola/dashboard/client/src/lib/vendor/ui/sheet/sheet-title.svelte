<script lang="ts">
  import { cn } from '$lib/utils/cn.util';
  import { Dialog as SheetPrimitive } from 'bits-ui';
  import type { Snippet } from 'svelte';

  let {
    class: className,
    ref = $bindable(null),
    children,
    ...restProps
  }: SheetPrimitive.TitleProps & { children?: Snippet } = $props();
</script>

<SheetPrimitive.Title
  bind:ref
  data-slot="sheet-title"
  class={cn("font-semibold text-foreground", className)}
  {...restProps}
>
  {@render children?.()}
</SheetPrimitive.Title>
