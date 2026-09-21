<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils/cn.util';
  import { useIsMobile } from '$lib/hooks/use-mobile.svelte.ts';
  import { TooltipProvider } from '$lib/components/ui/tooltip';
  import { SidebarState, setSidebar } from './context.svelte.ts';

  const SIDEBAR_WIDTH = '16rem';
  const SIDEBAR_WIDTH_ICON = '3rem';
  const SIDEBAR_KEYBOARD_SHORTCUT = 'b';

  type Props = HTMLAttributes<HTMLDivElement> & {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children?: Snippet;
  };

  let {
    defaultOpen = true,
    open = $bindable(undefined),
    onOpenChange,
    class: className,
    style,
    children,
    ...restProps
  }: Props = $props();

  const isMobileState = useIsMobile();
  const sidebar = new SidebarState(open ?? defaultOpen, isMobileState.current);
  setSidebar(sidebar);

  $effect(() => {
    sidebar.isMobile = isMobileState.current;
  });

  $effect(() => {
    if (open !== undefined) {
      sidebar.open = open;
    }
  });

  $effect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        sidebar.toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });
</script>

<TooltipProvider delayDuration={0}>
  <div
    data-slot="sidebar-wrapper"
    style="--sidebar-width: {SIDEBAR_WIDTH}; --sidebar-width-icon: {SIDEBAR_WIDTH_ICON}; {style ?? ''}"
    class={cn(
      'group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar',
      className
    )}
    {...restProps}
  >
    {@render children?.()}
  </div>
</TooltipProvider>
