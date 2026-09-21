<script lang="ts" module>
  import type { Snippet } from 'svelte';

  /**
   * Nenhum erro derruba a tela em silêncio.
   *
   * Sem isto, um erro durante a montagem esvazia o corpo da página e o navegador mostra uma
   * página em branco — ou preta, quando o sistema está em tema escuro. É o pior resultado
   * possível: não há mensagem, não há o que relatar, e quem abriu não sabe nem se o sistema
   * carregou.
   */
  export type AppErrorBoundaryProps = {
    children: Snippet;
  };

  function messageOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
</script>

<script lang="ts">
  let { children }: AppErrorBoundaryProps = $props();

  function handleError(error: unknown): void {
    console.error('[template] a tela quebrou ao montar', error);
  }
</script>

<svelte:boundary onerror={handleError}>
  {@render children()}

  {#snippet failed(error)}
    <div class="bg-ink-100 flex min-h-screen items-center justify-center p-6">
      <div role="alert" class="w-full max-w-lg rounded-sm border border-red-300 bg-white p-6 shadow-sm">
        <h1 class="text-lg font-bold text-red-800">A tela não carregou</h1>
        <p class="text-ink-700 mt-2 text-sm">
          O sistema encontrou um erro ao montar esta página. Nada do que você fez foi perdido —
          esta tela simplesmente não chegou a abrir.
        </p>
        <pre class="bg-ink-100 text-ink-900 mt-4 overflow-x-auto rounded-xs p-3 text-xs">{messageOf(error)}</pre>
        <button
          type="button"
          onclick={() => window.location.reload()}
          class="bg-brand-blue-800 mt-4 rounded-xs px-4 py-2 text-sm font-semibold text-white"
        >
          Recarregar
        </button>
      </div>
    </div>
  {/snippet}
</svelte:boundary>
