<script lang="ts" module>
  import { cn } from '$lib/utils/cn';

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
</script>

<script lang="ts">
  let { data, ui, state, actions }: TextAreaFieldProps = $props();

  const inputId = `ta-${Math.random().toString(36).slice(2, 9)}`;
  const errorId = `${inputId}-error`;
  const error = $derived(state?.error ?? null);
</script>

<div class={cn('flex flex-col gap-1.5', ui?.className)}>
  <label for={inputId} class="text-ink-700 text-sm font-medium">
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
    oninput={(event) => actions?.onChange?.((event.target as HTMLTextAreaElement).value)}
    onblur={() => actions?.onBlur?.()}
    class={cn(
      'bg-card text-foreground w-full resize-y rounded-lg border px-3 py-2.5 text-sm transition-colors',
      'placeholder:text-ink-500 disabled:cursor-not-allowed disabled:opacity-60',
      error ? 'border-destructive' : 'border-input',
    )}
  ></textarea>

  <div class="flex items-start justify-between gap-2">
    {#if error}
      <p id={errorId} role="alert" class="text-destructive text-xs font-medium">{error}</p>
    {:else}
      <span></span>
    {/if}

    {#if data.maxLength && data.value.length >= data.maxLength * 0.8}
      <span
        class={cn(
          'shrink-0 text-xs tabular-nums',
          data.value.length > data.maxLength ? 'text-destructive font-semibold' : 'text-ink-500',
        )}
      >
        {data.value.length}/{data.maxLength}
      </span>
    {/if}
  </div>
</div>
