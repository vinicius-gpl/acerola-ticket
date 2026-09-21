<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { PanelLeft } from 'lucide-svelte';
  import { cn } from '$lib/utils/cn.util';
  import { Button } from '../button';
  import { useSidebar } from './context.svelte';

  type Props = HTMLButtonAttributes & {
    class?: string;
  };

  let { class: className, onclick, ...restProps }: Props = $props();

  const sidebar = useSidebar();
</script>

<Button
  data-sidebar="trigger"
  data-slot="sidebar-trigger"
  variant="ghost"
  size="icon"
  class={cn('size-7', className)}
  onclick={(event) => {
    onclick?.(event);
    sidebar.toggleSidebar();
  }}
  {...restProps}
>
  <PanelLeft class="size-4" />
  <span class="sr-only">Toggle Sidebar</span>
</Button>
