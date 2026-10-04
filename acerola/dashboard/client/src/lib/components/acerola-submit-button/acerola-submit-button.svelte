<script lang="ts" module>
  import { cn } from '$lib/utils/cn';

  /**
   * O botão que envia o formulário.
   *
   * Ele se desabilita enquanto envia, e isso não é enfeite: sem a trava, dois cliques viram
   * dois registros — e o segundo volta como "já existe uma conta com esse e-mail", num
   * formulário que acabou de dar certo.
   */
  export type AcerolaSubmitButtonProps = {
    data: { label: string; loadingLabel?: string };
    ui?: { className?: string };
    state?: { isLoading?: boolean; isDisabled?: boolean };
  };
</script>

<script lang="ts">
  import Loader2 from '@lucide/svelte/icons/loader-2';

  let { data, ui, state }: AcerolaSubmitButtonProps = $props();

  const isBusy = $derived(Boolean(state?.isLoading));
</script>

<button
  type="submit"
  disabled={isBusy || state?.isDisabled}
  aria-busy={isBusy}
  class={cn(
    /* O degrau `md` da régua de medidas (`lib/theme/tokens.css`) — o mesmo do `ActionButton`,
       que é quem fica ao lado dele no rodapé do diálogo. Antes a altura vinha só do padding,
       e dava 4px a mais que o "Cancelar" ao lado. */
    'control-md rounded-control',
    'inline-flex w-full sm:w-auto items-center justify-center gap-2',
    'bg-primary text-primary-foreground text-sm font-semibold transition-colors shadow-xs',
    'hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60',
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
