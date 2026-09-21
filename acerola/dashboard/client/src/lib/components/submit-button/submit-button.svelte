<script lang="ts" module>
  import { cn } from '$lib/utils/cn';

  /**
   * O botão que envia o formulário.
   *
   * Ele se desabilita enquanto envia, e isso não é enfeite: sem a trava, dois cliques viram
   * dois registros — e o segundo volta como "já existe uma conta com esse e-mail", num
   * formulário que acabou de dar certo.
   */
  export type SubmitButtonProps = {
    data: { label: string; loadingLabel?: string };
    ui?: { className?: string };
    state?: { isLoading?: boolean; isDisabled?: boolean };
  };
</script>

<script lang="ts">
  import Loader2 from '@lucide/svelte/icons/loader-2';

  let { data, ui, state }: SubmitButtonProps = $props();

  const isBusy = $derived(Boolean(state?.isLoading));
</script>

<button
  type="submit"
  disabled={isBusy || state?.isDisabled}
  aria-busy={isBusy}
  class={cn(
    'inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5',
    'bg-brand-blue-800 text-sm font-semibold text-white transition-colors',
    'hover:bg-brand-blue-900 disabled:cursor-not-allowed disabled:opacity-60',
    ui?.className,
  )}
>
  <!-- `aria-busy` diz ao leitor de tela que a espera é esperada. Sem ele, o botão
       simplesmente para de responder. -->
  {#if isBusy}
    <Loader2 class="size-4 animate-spin" aria-hidden="true" />
  {/if}
  {isBusy ? (data.loadingLabel ?? data.label) : data.label}
</button>
