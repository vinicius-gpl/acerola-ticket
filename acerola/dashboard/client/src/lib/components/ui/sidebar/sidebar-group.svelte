<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils/cn';

  type Props = HTMLAttributes<HTMLDivElement> & {
    children?: Snippet;
  };

  let { class: className, children, ...restProps }: Props = $props();
</script>

<div
  data-slot="sidebar-group"
  data-sidebar="group"
  class={cn('relative flex w-full min-w-0 flex-col p-2', className)}
  {...restProps}
>
  {@render children?.()}
</div>
