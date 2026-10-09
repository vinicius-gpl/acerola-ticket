<script lang="ts" module>
  import { type FormFieldState } from '$lib/types/form-field.type';

  export type LoginField = 'email' | 'password';

  /**
   * A tela de login inteira, os dois lados — não um formulário genérico dentro de uma casca
   * de outra tela. É uma rota fora do grupo `(app)` (sem `AppShell`), então ela precisa da
   * própria estrutura de página.
   *
   * Função pura de props, igual a qualquer componente (CONTRIBUTING §3): valor e erro de cada
   * campo chegam prontos, o que abre a tela no Storybook preenchida, com erro ou enviando —
   * sem servidor e sem biblioteca de formulário no meio.
   */
  export type AcerolaLoginScreenProps = {
    data: { fields: Record<LoginField, FormFieldState> };
    state?: { isSubmitting?: boolean; error?: string | null };
    actions: {
      onLinkGithub?: () => void;
      onChange: (field: LoginField, value: string) => void;
      onBlur: (field: LoginField) => void;
      onSubmit: () => void;
    };
  };
</script>

<script lang="ts">
  import BrandMark from '$lib/components/acerola-brand-mark/acerola-brand-mark.svelte';
  import GitBranch from '@lucide/svelte/icons/git-branch';
  import ActionButton from '$lib/components/acerola-action-button/acerola-action-button.svelte';
  import ErrorState from '$lib/components/acerola-error-state/acerola-error-state.svelte';
  import SubmitButton from '$lib/components/acerola-submit-button/acerola-submit-button.svelte';
  import TextField from '$lib/components/acerola-text-field/acerola-text-field.svelte';

  let { data, state, actions }: AcerolaLoginScreenProps = $props();

  const fields = $derived(data.fields);
  const isSubmitting = $derived(Boolean(state?.isSubmitting));

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSubmit();
  }
</script>

<div class="bg-background grid min-h-svh lg:grid-cols-2">
  <div class="flex items-center justify-center p-6 sm:p-10">
    <div class="flex w-full max-w-sm flex-col gap-6">
      <BrandMark ui={{ size: 'lg' }} />

      <div class="flex flex-col gap-1.5">
        <h1 class="text-2xl font-semibold">Bem-vindo de volta</h1>
        <p class="text-muted-foreground text-sm">Entre com seu e-mail e senha para continuar.</p>
      </div>

      <form novalidate class="flex flex-col gap-4" onsubmit={handleSubmit}>
        <TextField
          data={{
            label: 'E-mail',
            name: 'email',
            value: fields.email.value,
            placeholder: 'voce@empresa.com',
          }}
          ui={{ type: 'email' }}
          state={{
            error: fields.email.error,
            isDisabled: isSubmitting,
            isAutoFocused: true,
          }}
          actions={{
            onChange: (value: string) => actions.onChange('email', value),
            onBlur: () => actions.onBlur('email'),
          }}
        />

        <TextField
          data={{ label: 'Senha', name: 'password', value: fields.password.value }}
          ui={{ type: 'password' }}
          state={{ error: fields.password.error, isDisabled: isSubmitting }}
          actions={{
            onChange: (value: string) => actions.onChange('password', value),
            onBlur: () => actions.onBlur('password'),
          }}
        />

        <!-- Também é por aqui que entra quem NUNCA teve senha: conta criada no painel da Neon
             nasce sem senha, e este link é o caminho de definir a primeira. -->
        <a
          href="/forgot-password"
          class="text-muted-foreground hover:text-foreground self-end text-sm underline-offset-4 hover:underline"
        >
          Esqueci minha senha
        </a>

        {#if state?.error}
          <ErrorState data={{ message: state.error }} ui={{ variant: 'inline' }} />
        {/if}

        <SubmitButton
          data={{ label: 'Entrar', loadingLabel: 'Entrando…' }}
          state={{ isLoading: isSubmitting }}
        />
      </form>
      {#if actions.onLinkGithub}
        <ActionButton
          data={{ label: 'Vincular GitHub' }}
          ui={{ icon: GitBranch, variant: 'secondary', size: 'lg', className: 'w-full' }}
          state={{ isDisabled: isSubmitting }}
          actions={{ onClick: actions.onLinkGithub }}
        />
        <p class="text-xs text-muted-foreground">
          Informe seu e-mail e senha acima. Após entrar, você poderá vincular sua conta para acessar
          o módulo Sistema.
        </p>
      {/if}
    </div>
  </div>

  <!-- Escondido abaixo de `lg`: numa tela pequena o formulário já ocupa o espaço inteiro, e
       repetir a marca aqui embaixo só empurraria o formulário para fora da vista. -->
  <div class="bg-foreground text-background relative hidden flex-col justify-end p-14 lg:flex">
    <p class="text-2xl leading-snug font-semibold">
      Organize o trabalho do seu jeito, sem perder de vista o que importa.
    </p>
  </div>
</div>
