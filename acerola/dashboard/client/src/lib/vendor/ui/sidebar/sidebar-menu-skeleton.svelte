<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils/cn.util';
  import { Skeleton } from '../skeleton';

  type Props = HTMLAttributes<HTMLDivElement> & {
    showIcon?: boolean;
  };

  let { showIcon = false, class: className, ...restProps }: Props = $props();

  const width = `${Math.floor(Math.random() * 40) + 50}%`;
</script>

<div
  data-slot="sidebar-menu-skeleton"
  data-sidebar="menu-skeleton"
  class={cn('flex h-8 items-center gap-2 rounded-md px-2', className)}
  {...restProps}
>
  {#if showIcon}
    <Skeleton class="size-4 rounded-md" data-sidebar="menu-skeleton-icon" />
  {/if}
  <Skeleton
    class="h-4 max-w-(--skeleton-width) flex-1"
    data-sidebar="menu-skeleton-text"
    style="--skeleton-width: {width};"
  />
</div>
