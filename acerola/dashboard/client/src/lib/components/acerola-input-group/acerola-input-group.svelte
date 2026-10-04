<script lang="ts" module>
  import type { Snippet } from 'svelte';

  /**
   * Um campo de texto com algo colado nele: um ícone ou um prefixo na frente (`R$`, uma lupa),
   * uma unidade ou um botão atrás (`kg`, "copiar"). Envolve o `ui/input-group` do shadcn.
   *
   * A altura é a de todo campo de formulário (`control-lg`, 40px) e o raio é o de controle —
   * definidos AQUI, e não no `ui/`, que o CLI sobrescreve, nem na tela, que não decide altura.
   * Sem prefixo nem sufixo, use o `acerola-text-field`: é o mesmo campo, sem o grupo em volta.
   */
  export type AcerolaInputGroupProps = {
    data: {
      label: string;
      name: string;
      value: string;
      placeholder?: string;
    };
    ui?: { className?: string };
    state?: { error?: string | null; isDisabled?: boolean };
    actions?: { onChange?: (value: string) => void; onBlur?: () => void };
    /** O que fica colado na frente do texto. */
    prefix?: Snippet;
    /** O que fica colado atrás do texto. */
    suffix?: Snippet;
  };
</script>

<script lang="ts">
  import { InputGroup, InputGroupAddon, InputGroupInput } from '$lib/components/ui/input-group';
  import { cn } from '$lib/utils/cn';

  let { data, ui, state: fieldState, actions, prefix, suffix }: AcerolaInputGroupProps = $props();

  const inputId = `ig-${Math.random().toString(36).slice(2, 9)}`;
  const errorId = `${inputId}-error`;

  const error = $derived(fieldState?.error ?? null);
  const hasError = $derived(Boolean(error));
</script>

<div class={cn('flex flex-col gap-1.5', ui?.className)}>
  <label for={inputId} class="text-ink-700 text-sm font-medium">{data.label}</label>

  <!-- `px-0!`: o `control-lg` traz o respiro lateral de um campo sozinho; aqui quem dá o
       respiro é o prefixo, o sufixo e o próprio input de dentro. -->
  <InputGroup
    class={cn('control-lg rounded-control bg-card px-0!', hasError && 'border-destructive')}
  >
    {#if prefix}
      <InputGroupAddon>{@render prefix()}</InputGroupAddon>
    {/if}

    <InputGroupInput
      id={inputId}
      name={data.name}
      placeholder={data.placeholder}
      disabled={fieldState?.isDisabled}
      aria-invalid={hasError}
      aria-describedby={hasError ? errorId : undefined}
      bind:value={() => data.value, (value) => actions?.onChange?.(value)}
      onblur={() => actions?.onBlur?.()}
    />

    {#if suffix}
      <InputGroupAddon align="inline-end">{@render suffix()}</InputGroupAddon>
    {/if}
  </InputGroup>

  {#if hasError}
    <p id={errorId} role="alert" class="text-destructive text-xs font-medium">{error}</p>
  {/if}
</div>
