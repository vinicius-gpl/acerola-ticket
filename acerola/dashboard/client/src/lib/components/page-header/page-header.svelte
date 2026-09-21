<script lang="ts" module>
  import type { Snippet } from 'svelte';

  export type PageHeaderProps = {
    data: { title: string; description?: string };
    ui?: { className?: string };
    /** As ações da tela, já montadas (normalmente `ActionButton`). Ficam à direita. */
    children?: Snippet;
  };
</script>

<script lang="ts">
  import { cn } from '$lib/utils/cn';

  let { data, ui, children }: PageHeaderProps = $props();
</script>

<header
  class={cn(
    'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
    ui?.className
  )}
>
  <div class="min-w-0">
    <h1 class="text-ink-900 text-xl font-bold">{data.title}</h1>
    {#if data.description}
      <p class="text-ink-500 mt-0.5 text-sm">{data.description}</p>
    {/if}
  </div>
  {#if children}
    <div class="flex shrink-0 flex-wrap gap-2">
      {@render children()}
    </div>
  {/if}
</header>
