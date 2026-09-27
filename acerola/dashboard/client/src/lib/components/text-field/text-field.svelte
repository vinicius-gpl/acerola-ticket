<script lang="ts" module>
  import type { HTMLInputAttributes } from 'svelte/elements';
  import { cn } from '$lib/utils/cn';

  /**
   * Um campo de formulário: rótulo, entrada e erro.
   *
   * O erro fica COLADO no campo, e não num resumo no topo. Resumo obriga a pessoa a
   * procurar qual dos campos ele descreve, e num formulário de quatro campos ela erra a
   * procura — corrige o que estava certo e reenvia o mesmo erro.
   */
  /* `date` entra aqui, e não num componente separado, porque só o `type` do `input` muda —
     rótulo, erro e acessibilidade são exatamente os mesmos. */
  export type TextFieldType = 'text' | 'email' | 'password' | 'date' | 'tel';

  export type TextFieldProps = {
    data: {
      label: string;
      name: string;
      value: string;
      placeholder?: string;
      autoComplete?: HTMLInputAttributes['autocomplete'];
      /** Pinta um `*` vermelho depois do rótulo. O texto do rótulo continua limpo, sem
       * caractere solto — só CSS, não string. */
      isRequired?: boolean;
    };
    ui?: {
      type?: TextFieldType;
      className?: string;
    };
    state?: {
      error?: string | null;
      isDisabled?: boolean;
      isAutoFocused?: boolean;
    };
    actions?: {
      onChange?: (value: string) => void;
      onBlur?: () => void;
    };
  };
</script>

<script lang="ts">
  import Eye from '@lucide/svelte/icons/eye';
  import EyeOff from '@lucide/svelte/icons/eye-off';

  let { data, ui, state: fieldState, actions }: TextFieldProps = $props();

  /* `$state` de estado puramente visual. Nada aqui busca dado. */
  let isRevealed = $state(false);

  const inputId = `tf-${Math.random().toString(36).slice(2, 9)}`;
  const errorId = `${inputId}-error`;

  const type = $derived(ui?.type ?? 'text');
  const error = $derived(fieldState?.error ?? null);
  const isPassword = $derived(type === 'password');
  const hasError = $derived(Boolean(error));

  /**
   * Revelar troca o `type`, e não um CSS: com `-webkit-text-security` o gerenciador de senhas
   * do navegador deixa de reconhecer o campo.
   */
  const inputType = $derived(isPassword && !isRevealed ? 'password' : isPassword ? 'text' : type);

  /**
   * `h-10` e `rounded-xl`, fixos — os mesmos valores do `DatePicker` e do `ActionButton`
   * (o botão-raiz de que todo botão da tela deriva). Antes a altura vinha só do padding
   * (`py-2.5`) e o raio era `rounded-lg`, cada componente com o seu; campo de texto, seletor,
   * data e botão nunca alinhavam na mesma fileira nem pareciam a mesma família de controle.
   */
  const inputClass = $derived(
    cn(
      'bg-card text-foreground h-10 w-full rounded-xl border px-3 py-2 text-sm transition-colors',
      'placeholder:text-ink-500 disabled:cursor-not-allowed disabled:opacity-60',
      isPassword && 'pr-11',
      hasError ? 'border-destructive' : 'border-input',
    ),
  );
</script>

<div class={cn('flex flex-col gap-1.5', ui?.className)}>
  <label for={inputId} class="text-ink-700 text-sm font-medium">
    {data.label}
    {#if data.isRequired}
      <span class="text-destructive" aria-hidden="true">*</span>
    {/if}
  </label>

  <div class="relative">
    <!-- O foco automático sozinho deixa o cursor no fim do texto: um valor mais comprido que
         a caixa nasce rolado, escondendo a primeira letra. Selecionar tudo (`onfocus`) mostra
         o valor inteiro e já deixa pronto para a pessoa digitar por cima. -->
    <input
      id={inputId}
      name={data.name}
      type={inputType}
      value={data.value}
      placeholder={data.placeholder}
      autocomplete={data.autoComplete}
      autofocus={fieldState?.isAutoFocused}
      disabled={fieldState?.isDisabled}
      required={data.isRequired}
      aria-invalid={hasError}
      aria-describedby={hasError ? errorId : undefined}
      oninput={(event) => actions?.onChange?.((event.target as HTMLInputElement).value)}
      onblur={() => actions?.onBlur?.()}
      onfocus={(event) => fieldState?.isAutoFocused && event.currentTarget.select()}
      class={inputClass}
    />

    <!-- `tabindex="-1"` de propósito: no teclado, a tecla seguinte à senha precisa ser o
         botão de entrar. Parar num olho no meio do caminho atrapalha quem opera sem mouse. -->
    {#if isPassword}
      <button
        type="button"
        tabindex={-1}
        onclick={() => (isRevealed = !isRevealed)}
        aria-label={isRevealed ? 'Ocultar senha' : 'Mostrar senha'}
        class="text-ink-500 hover:text-ink-700 absolute inset-y-0 right-0 flex w-11 items-center justify-center"
      >
        {#if isRevealed}
          <EyeOff class="size-4" aria-hidden="true" />
        {:else}
          <Eye class="size-4" aria-hidden="true" />
        {/if}
      </button>
    {/if}
  </div>

  <!-- `role="alert"` para o erro ser anunciado quando aparece, e não só quando alguém voltar ao campo. -->
  {#if hasError}
    <p id={errorId} role="alert" class="text-destructive text-xs font-medium">{error}</p>
  {/if}
</div>
