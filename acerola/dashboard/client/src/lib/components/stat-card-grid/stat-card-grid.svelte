<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils/cn.util';

  let {
    ui,
    children,
  }: {
    ui?: { className?: string };
    children?: Snippet;
  } = $props();
</script>

<div class={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4', ui?.className)}>
  {@render children?.()}
</div>
