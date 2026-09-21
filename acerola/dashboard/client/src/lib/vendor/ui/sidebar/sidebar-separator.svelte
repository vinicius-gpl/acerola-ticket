<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils/cn.util';
  import { Separator } from '../separator';

  type Props = HTMLAttributes<HTMLDivElement> & {
    class?: string;
  };

  let { class: className, ...restProps }: Props = $props();
</script>

<Separator
  data-slot="sidebar-separator"
  data-sidebar="separator"
  class={cn('mx-2 w-auto bg-sidebar-border', className)}
  {...restProps}
/>
