import { Loader2 } from 'lucide-react';

import { cn } from '../../utils/cn.util';

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

export function SubmitButton({ data, ui, state }: SubmitButtonProps) {
  const isBusy = Boolean(state?.isLoading);

  return (
    <button
      type="submit"
      disabled={isBusy || state?.isDisabled}
      /* `aria-busy` diz ao leitor de tela que a espera é esperada. Sem ele, o botão
         simplesmente para de responder. */
      aria-busy={isBusy}
      className={cn(
        'inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5',
        'bg-brand-blue-800 text-sm font-semibold text-white transition-colors',
        'hover:bg-brand-blue-900 disabled:cursor-not-allowed disabled:opacity-60',
        ui?.className,
      )}
    >
      {isBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {isBusy ? (data.loadingLabel ?? data.label) : data.label}
    </button>
  );
}
