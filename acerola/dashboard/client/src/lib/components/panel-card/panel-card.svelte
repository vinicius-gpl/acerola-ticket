<script lang="ts" module>
  import type { Snippet } from 'svelte';

  /**
   * A CASCA de um bloco do painel: título, uma linha de explicação e o conteúdo.
   *
   * Existe porque o mesmo cartão estava copiado em cada seção, e cópia de casca é como uma
   * tela fica com oito blocos de cantos, sombras e espaçamentos ligeiramente diferentes.
   *
   * A borda é fina e em VOLTA, nunca colorida de um lado só: ou o cartão é colorido inteiro
   * (é o caso do `StatCard`), ou a borda é fina em volta, ou não há borda.
   *
   * O `tools` é para o que muda o que o bloco mostra — uma alternância entre Dia, Semana e
   * Mês, por exemplo. Ele fica no alto, à direita do título, e não embaixo: quem lê precisa
   * saber o recorte ANTES de ler o número.
   */
  export type PanelCardProps = {
    data: { title: string; hint?: string | null };
    ui?: { className?: string; bodyClassName?: string };
    /** O controle que muda o recorte do bloco. */
    tools?: Snippet;
    children: Snippet;
  };
</script>

<script lang="ts">
  import { cn } from '$lib/utils/cn';

  let { data, ui, tools, children }: PanelCardProps = $props();
</script>

<section class={cn('bg-card border-border rounded-surface border p-5 shadow-xs', ui?.className)}>
  <!-- Empilhado no celular: título e controle lado a lado a 360 px espremem os dois. -->
  <div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
    <div class="min-w-0">
      <h2 class="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
        {data.title}
      </h2>
      {#if data.hint}
        <p class="text-muted-foreground/80 mt-0.5 text-xs">{data.hint}</p>
      {/if}
    </div>
    {#if tools}
      <div class="shrink-0">{@render tools()}</div>
    {/if}
  </div>

  <div class={ui?.bodyClassName}>
    {@render children()}
  </div>
</section>
