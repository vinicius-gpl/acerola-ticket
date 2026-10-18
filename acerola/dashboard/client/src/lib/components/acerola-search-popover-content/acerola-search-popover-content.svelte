<script lang="ts">
  import { MediaQuery } from 'svelte/reactivity';
  import type { ComponentProps } from 'svelte';
  import PopoverContent from '$lib/components/ui/popover/popover-content.svelte';
  import { cn } from '$lib/utils/cn';

  // Abrir opções no celular não deve abrir o teclado antes de a pessoa tocar na busca.
  let {
    ref = $bindable(null),
    class: className,
    onOpenAutoFocus,
    ...restProps
  }: ComponentProps<typeof PopoverContent> = $props();
  const isMobile = new MediaQuery('(max-width: 639px)');

  function onOpenFocus(event: Event): void {
    onOpenAutoFocus?.(event);
    if (event.defaultPrevented || !isMobile.current) return;
    event.preventDefault();
    ref?.focus({ preventScroll: true });
  }
</script>

<PopoverContent
  {...restProps}
  bind:ref
  strategy="fixed"
  updatePositionStrategy="always"
  collisionPadding={12}
  onOpenAutoFocus={onOpenFocus}
  class={cn(
    'min-h-0 max-h-[var(--bits-popover-content-available-height)] overflow-hidden gap-0',
    '[&>div:first-child]:shrink-0 [&>div:last-child]:min-h-0',
    className,
  )}
/>
