<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import XIcon from '@lucide/svelte/icons/x';
  import { Dialog as DialogPrimitive } from 'bits-ui';
  import DialogPortal from './dialog-portal.svelte';
  import DialogOverlay from './dialog-overlay.svelte';
  import type { Snippet } from 'svelte';

  let {
    class: className,
    showCloseButton = true,
    ref = $bindable(null),
    children,
    ...restProps
  }: DialogPrimitive.ContentProps & { showCloseButton?: boolean; children?: Snippet } = $props();
</script>

<DialogPortal>
  <DialogOverlay />
  <DialogPrimitive.Content
    bind:ref
    data-slot="dialog-content"
    class={cn(
      "fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg",
      className
    )}
    {...restProps}
  >
    {@render children?.()}
    {#if showCloseButton}
      <DialogPrimitive.Close
        data-slot="dialog-close"
        class="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer"
      >
        <XIcon />
        <span class="sr-only">Close</span>
      </DialogPrimitive.Close>
    {/if}
  </DialogPrimitive.Content>
</DialogPortal>
