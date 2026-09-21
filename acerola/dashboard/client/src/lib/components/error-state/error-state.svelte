<script lang="ts" module>
  /**
   * A falha, com o motivo escrito — nunca um silêncio nem um "algo deu errado".
   *
   * Duas formas, e a escolha não é estética: `block` ocupa o lugar do conteúdo que não
   * carregou (a lista inteira falhou); `inline` é uma linha dentro de um formulário ou
   * modal, onde o resto da tela continua válido e um bloco vermelho gigante assustaria mais
   * do que informa.
   *
   * `onRetry` só aparece quando tentar de novo pode de fato resolver. Um botão que reexecuta
   * uma recusa de permissão só ensina a pessoa a clicar duas vezes antes de pedir ajuda.
   * `role="alert"` é o que faz o leitor de tela anunciar a falha na hora em que ela aparece.
   */
  export type ErrorStateProps = {
    data: { message: string; title?: string };
    ui?: { variant?: 'block' | 'inline'; className?: string };
    state?: { isRetrying?: boolean };
    actions?: { onRetry?: () => void };
  };
</script>

<script lang="ts">
  import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
  import RotateCw from '@lucide/svelte/icons/rotate-cw';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state, actions }: ErrorStateProps = $props();

  const isInline = $derived(ui?.variant === 'inline');
  const isRetrying = $derived(Boolean(state?.isRetrying));
</script>

<div
  role="alert"
  class={cn(
    'flex gap-3 rounded-lg border border-red-300 bg-red-50 text-red-900',
    isInline ? 'items-center px-3 py-2' : 'items-start p-4',
    ui?.className
  )}
>
  <AlertTriangle
    class={cn('shrink-0 text-red-600', isInline ? 'size-4' : 'mt-0.5 size-5')}
    aria-hidden="true"
  />

  {#if isInline}
    <p class="min-w-0 flex-1 text-sm break-words">{data.message}</p>
  {:else}
    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold">{data.title ?? 'Algo deu errado'}</p>
      <p class="mt-0.5 text-sm break-words text-red-800">{data.message}</p>
    </div>
  {/if}

  {#if actions?.onRetry}
    <button
      type="button"
      onclick={actions.onRetry}
      disabled={isRetrying}
      class="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-60"
    >
      <RotateCw class={cn('size-3.5', isRetrying && 'animate-spin')} aria-hidden="true" />
      Tentar de novo
    </button>
  {/if}
</div>
