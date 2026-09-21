<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils/cn.util';

  type Props = HTMLAttributes<HTMLUListElement> & {
    children?: Snippet;
  };

  let { class: className, children, ...restProps }: Props = $props();
</script>

<ul
  data-slot="sidebar-menu-sub"
  data-sidebar="menu-sub"
  class={cn(
    'mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5',
    'group-data-[collapsible=icon]:hidden',
    className
  )}
  {...restProps}
>
  {@render children?.()}
</ul>
