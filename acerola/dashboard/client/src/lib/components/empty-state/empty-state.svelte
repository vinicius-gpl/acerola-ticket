<script lang="ts" module>
  import type { LucideIcon } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  export type EmptyStateProps = {
    data: { title: string; description?: string };
    ui?: { icon?: LucideIcon; className?: string };
    /** A ação sugerida, já montada (normalmente um `ActionButton`). */
    children?: Snippet;
  };
</script>

<script lang="ts">
  import Inbox from '@lucide/svelte/icons/inbox';
  import { cn } from '$lib/utils/cn';

  let { data, ui, children }: EmptyStateProps = $props();

  const Icon = $derived(ui?.icon ?? Inbox);
</script>

<div
  class={cn(
    'border-ink-300 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-12 text-center',
    ui?.className
  )}
>
  <span class="bg-ink-100 text-ink-500 flex size-11 items-center justify-center rounded-full">
    <Icon class="size-5" aria-hidden="true" />
  </span>
  <p class="text-ink-900 text-sm font-semibold">{data.title}</p>
  {#if data.description}
    <p class="text-ink-500 max-w-sm text-sm">{data.description}</p>
  {/if}
  {#if children}
    <div class="mt-2">
      {@render children()}
    </div>
  {/if}
</div>
