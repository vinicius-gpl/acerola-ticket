<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils/cn.util';
  import { Input } from '$lib/components/ui/input';

  type Props = HTMLInputAttributes & {
    class?: string;
  };

  let { class: className, ...restProps }: Props = $props();
</script>

<Input
  data-slot="sidebar-input"
  data-sidebar="input"
  class={cn('h-8 w-full bg-background shadow-none', className)}
  {...restProps}
/>
