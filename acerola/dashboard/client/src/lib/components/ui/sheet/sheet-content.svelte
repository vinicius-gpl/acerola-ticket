<script lang="ts">
  import { cn } from '$lib/utils/cn.util';
  import XIcon from '@lucide/svelte/icons/x';
  import { Dialog as SheetPrimitive } from 'bits-ui';
  import SheetPortal from './sheet-portal.svelte';
  import SheetOverlay from './sheet-overlay.svelte';
  import type { Snippet } from 'svelte';

  let {
    class: className,
    side = 'right',
    showCloseButton = true,
    ref = $bindable(null),
    children,
    ...restProps
  }: SheetPrimitive.ContentProps & {
    side?: 'top' | 'right' | 'bottom' | 'left';
    showCloseButton?: boolean;
    children?: Snippet;
  } = $props();
</script>

<SheetPortal>
  <SheetOverlay />
  <SheetPrimitive.Content
    bind:ref
    data-slot="sheet-content"
    class={cn(
      "fixed z-50 flex flex-col gap-4 bg-background shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:animate-in data-[state=open]:duration-500",
      side === "right" &&
        "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      side === "left" &&
        "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
      side === "top" &&
        "inset-x-0 top-0 h-auto border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
      side === "bottom" &&
        "inset-x-0 bottom-0 h-auto border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
      className
    )}
    {...restProps}
  >
    {@render children?.()}
    {#if showCloseButton}
      <SheetPrimitive.Close
        data-slot="sheet-close"
        class="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-secondary cursor-pointer"
      >
        <XIcon class="size-4" />
        <span class="sr-only">Close</span>
      </SheetPrimitive.Close>
    {/if}
  </SheetPrimitive.Content>
</SheetPortal>
