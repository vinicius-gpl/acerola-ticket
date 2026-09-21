<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import { Tooltip as TooltipPrimitive } from 'bits-ui';
  import type { Snippet } from 'svelte';

  let {
    class: className,
    sideOffset = 0,
    ref = $bindable(null),
    children,
    ...restProps
  }: TooltipPrimitive.ContentProps & { children?: Snippet } = $props();
</script>

<TooltipPrimitive.Portal>
  <TooltipPrimitive.Content
    bind:ref
    data-slot="tooltip-content"
    {sideOffset}
    class={cn(
      "z-50 w-fit rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
      className
    )}
    {...restProps}
  >
    {@render children?.()}
    <TooltipPrimitive.Arrow class="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground" />
  </TooltipPrimitive.Content>
</TooltipPrimitive.Portal>
