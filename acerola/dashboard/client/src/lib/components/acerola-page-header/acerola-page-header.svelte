<script lang="ts" module>
  import type { Snippet } from 'svelte';

  export type AcerolaPageHeaderProps = {
    data: { title: string; description?: string };
    ui?: { className?: string };
    /** As ações da tela, já montadas (normalmente `ActionButton`). Ficam à direita. */
    children?: Snippet;
  };
</script>

<script lang="ts">
  import { cn } from '$lib/utils/cn';

  let { data, ui, children }: AcerolaPageHeaderProps = $props();
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
    <!-- `items-center`: sem ele os itens da fileira esticam (é o padrão do flex), e um grupo
         de botões pequenos ao lado de um botão maior — os de exportar ao lado de "Cadastrar
         computador" — encosta no topo em vez de ficar na mesma linha do meio. Com o
         `flex-wrap`, o mesmo vale para a segunda linha quando a tela é estreita. -->
    <div class="flex shrink-0 flex-wrap items-center gap-2">
      {@render children()}
    </div>
  {/if}
</header>
