<script lang="ts" module>
  import { cva, type VariantProps } from 'class-variance-authority';

  export const sidebarMenuButtonVariants = cva(
    'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm ring-sidebar-ring outline-hidden transition-[width,height,padding] group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
    {
      variants: {
        variant: {
          default: 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          outline:
            'bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_var(--sidebar-accent)]',
        },
        size: {
          default: 'h-8 text-sm',
          sm: 'h-7 text-xs',
          lg: 'h-12 text-sm group-data-[collapsible=icon]:p-0!',
        },
      },
      defaultVariants: {
        variant: 'default',
        size: 'default',
      },
    }
  );

  export type SidebarMenuButtonVariant = VariantProps<typeof sidebarMenuButtonVariants>['variant'];
  export type SidebarMenuButtonSize = VariantProps<typeof sidebarMenuButtonVariants>['size'];
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils/cn';
  import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip';
  import { useSidebar } from './context.svelte.ts';

  type Props = HTMLButtonAttributes & {
    isActive?: boolean;
    variant?: SidebarMenuButtonVariant;
    size?: SidebarMenuButtonSize;
    tooltip?: string;
    children?: Snippet;
    /** Troca o `<button>` pelo elemento que a marcação passar — usado pro item de menu virar link. */
    child?: Snippet<[{ props: Record<string, unknown> }]>;
  };

  let {
    isActive = false,
    variant = 'default',
    size = 'default',
    tooltip,
    class: className,
    children,
    child: renderChild,
    ...restProps
  }: Props = $props();

  const sidebar = useSidebar();

  const buttonProps = $derived({
    'data-slot': 'sidebar-menu-button',
    'data-sidebar': 'menu-button',
    'data-size': size,
    'data-active': isActive,
    class: cn(sidebarMenuButtonVariants({ variant, size }), className),
    ...restProps,
  });
</script>

{#snippet buttonEl()}
  {#if renderChild}
    {@render renderChild({ props: buttonProps })}
  {:else}
    <button {...buttonProps}>
      {@render children?.()}
    </button>
  {/if}
{/snippet}

{#if tooltip}
  <Tooltip>
    <TooltipTrigger>
      {#snippet child({ props })}
        {#if renderChild}
          {@render renderChild({ props: { ...buttonProps, ...props } })}
        {:else}
          <button {...buttonProps} {...props}>
            {@render children?.()}
          </button>
        {/if}
      {/snippet}
    </TooltipTrigger>
    <TooltipContent
      side="right"
      align="center"
      hidden={sidebar.state !== 'collapsed' || sidebar.isMobile}
    >
      {tooltip}
    </TooltipContent>
  </Tooltip>
{:else}
  {@render buttonEl()}
{/if}
