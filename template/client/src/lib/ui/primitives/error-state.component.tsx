import { AlertTriangle, RotateCw } from 'lucide-react';

import { cn } from '../../utils/cn.util';

/**
 * Falha que precisa APARECER: em vermelho, com o motivo, até resolver.
 *
 * É a trava mais importante de interface do CONTRIBUTING (§15). Aviso que some sozinho, ou
 * erro que vai só para o console, chega na equipe como "não está salvando" — sem nada para
 * investigar.
 *
 * `role="alert"` faz o leitor de tela anunciar na hora. O botão de tentar de novo só aparece
 * quando há o que tentar: oferecer um botão que não resolve nada ensina a pessoa a ignorá-lo.
 */
export type ErrorStateProps = {
  data: { message: string; title?: string };
  ui?: { variant?: 'block' | 'inline'; className?: string };
  state?: { isRetrying?: boolean };
  actions?: { onRetry?: () => void };
};

export function ErrorState({ data, ui, state, actions }: ErrorStateProps) {
  const isInline = ui?.variant === 'inline';

  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-lg border border-red-300 bg-red-50 text-red-900',
        isInline ? 'items-center px-3 py-2' : 'items-start p-4',
        ui?.className,
      )}
    >
      <AlertTriangle
        className={cn('shrink-0 text-red-600', isInline ? 'size-4' : 'mt-0.5 size-5')}
        aria-hidden="true"
      />

      <ErrorText data={data} ui={{ isInline }} />

      {actions?.onRetry ? (
        <RetryButton
          state={{ isRetrying: Boolean(state?.isRetrying) }}
          actions={{ onRetry: actions.onRetry }}
        />
      ) : null}
    </div>
  );
}

function ErrorText({ data, ui }: { data: ErrorStateProps['data']; ui: { isInline: boolean } }) {
  if (ui.isInline) return <p className="min-w-0 flex-1 text-sm break-words">{data.message}</p>;

  return (
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold">{data.title ?? 'Algo deu errado'}</p>
      <p className="mt-0.5 text-sm break-words text-red-800">{data.message}</p>
    </div>
  );
}

function RetryButton({
  state,
  actions,
}: {
  state: { isRetrying: boolean };
  actions: { onRetry: () => void };
}) {
  return (
    <button
      type="button"
      onClick={actions.onRetry}
      disabled={state.isRetrying}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-60"
    >
      <RotateCw className={cn('size-3.5', state.isRetrying && 'animate-spin')} aria-hidden="true" />
      Tentar de novo
    </button>
  );
}
