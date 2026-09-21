<script lang="ts">
  import { cn } from '$lib/utils/cn.util';
  import { Select as SelectPrimitive } from 'bits-ui';
  import type { Snippet } from 'svelte';

  let {
    class: className,
    sideOffset = 4,
    children,
    ...restProps
  }: SelectPrimitive.ContentProps & { children?: Snippet } = $props();
</script>

<SelectPrimitive.Portal>
  <SelectPrimitive.Content
    data-slot="select-content"
    {sideOffset}
    class={cn(
      "relative z-50 max-h-96 min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
      className
    )}
    {...restProps}
  >
    <SelectPrimitive.Viewport class="p-1">
      {@render children?.()}
    </SelectPrimitive.Viewport>
  </SelectPrimitive.Content>
</SelectPrimitive.Portal>
