import { useId } from 'react';

import { cn } from '../../utils/cn.util';

/**
 * Um campo de texto longo: rótulo, área e erro. Mesmo contrato do `TextField`.
 *
 * O erro fica COLADO no campo, e não num resumo no topo: resumo obriga a pessoa a procurar
 * qual dos campos ele descreve.
 *
 * O contador aparece só perto do limite (80%). Contador o tempo todo é ruído; contador
 * nenhum é descobrir o limite quando o servidor recusa.
 */
export type TextAreaFieldProps = {
  data: {
    label: string;
    name: string;
    value: string;
    placeholder?: string;
    maxLength?: number;
  };
  ui?: { rows?: number; className?: string };
  state?: { error?: string | null; isDisabled?: boolean };
  actions?: { onChange?: (value: string) => void; onBlur?: () => void };
};

export function TextAreaField({ data, ui, state, actions }: TextAreaFieldProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const error = state?.error ?? null;

  return (
    <div className={cn('flex flex-col gap-1.5', ui?.className)}>
      <label htmlFor={inputId} className="text-ink-700 text-sm font-medium">
        {data.label}
      </label>

      <textarea
        id={inputId}
        name={data.name}
        value={data.value}
        rows={ui?.rows ?? 4}
        placeholder={data.placeholder}
        disabled={state?.isDisabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => actions?.onChange?.(event.target.value)}
        onBlur={() => actions?.onBlur?.()}
        className={cn(
          'bg-card text-foreground w-full resize-y rounded-lg border px-3 py-2.5 text-sm transition-colors',
          'placeholder:text-ink-500 disabled:cursor-not-allowed disabled:opacity-60',
          error ? 'border-destructive' : 'border-input',
        )}
      />

      <div className="flex items-start justify-between gap-2">
        {error ? (
          <p id={errorId} role="alert" className="text-destructive text-xs font-medium">
            {error}
          </p>
        ) : (
          <span />
        )}
        <CharacterCount data={{ length: data.value.length, maxLength: data.maxLength }} />
      </div>
    </div>
  );
}

function CharacterCount({ data }: { data: { length: number; maxLength?: number } }) {
  if (!data.maxLength) return null;
  if (data.length < data.maxLength * 0.8) return null;

  return (
    <span
      className={cn(
        'shrink-0 text-xs tabular-nums',
        data.length > data.maxLength ? 'text-destructive font-semibold' : 'text-ink-500',
      )}
    >
      {data.length}/{data.maxLength}
    </span>
  );
}
