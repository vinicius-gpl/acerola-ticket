<script lang="ts" module>
  import { type FormFieldState } from '$lib/types/form-field.type';

  export type ResetPasswordField = 'password' | 'passwordConfirmation';

  /**
   * A tela onde a pessoa escolhe a própria senha, aberta pelo link que chegou por e-mail.
   *
   * `isLinkValid` cobre o caso que mais aparece na prática: link vencido (vale 15 minutos) ou
   * aberto pela metade. Sem esse estado, a pessoa preencheria os dois campos para só então
   * descobrir que precisa começar de novo.
   *
   * Função pura de props (CONTRIBUTING §3) — quem lê o endereço e conversa com o Neon Auth é
   * o hook.
   */
  export type ResetPasswordScreenProps = {
    data: { fields: Record<ResetPasswordField, FormFieldState> };
    state?: { isSubmitting?: boolean; isLinkValid?: boolean; error?: string | null };
    actions: {
      onChange: (field: ResetPasswordField, value: string) => void;
      onBlur: (field: ResetPasswordField) => void;
      onSubmit: () => void;
    };
  };
</script>

<script lang="ts">
  import BrandMark from '$lib/components/brand-mark/brand-mark.svelte';
  import ErrorState from '$lib/components/error-state/error-state.svelte';
  import SubmitButton from '$lib/components/submit-button/submit-button.svelte';
  import TextField from '$lib/components/text-field/text-field.svelte';

  let { data, state, actions }: ResetPasswordScreenProps = $props();

  const fields = $derived(data.fields);
  const isSubmitting = $derived(Boolean(state?.isSubmitting));
  const isLinkValid = $derived(state?.isLinkValid !== false);

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSubmit();
  }
</script>

<div class="bg-background grid min-h-svh lg:grid-cols-2">
  <div class="flex items-center justify-center p-6 sm:p-10">
    <div class="flex w-full max-w-sm flex-col gap-6">
      <BrandMark ui={{ size: 'lg' }} />

      {#if !isLinkValid}
        <div class="flex flex-col gap-1.5">
          <h1 class="text-2xl font-semibold">Este link não vale mais</h1>
          <p class="text-muted-foreground text-sm">
            O link de criar senha vale por 15 minutos e só pode ser usado uma vez. Peça outro para
            continuar.
          </p>
        </div>

        <a
          href="/forgot-password"
          class="text-primary text-sm font-medium underline-offset-4 hover:underline"
        >
          Pedir um link novo
        </a>
      {:else}
        <div class="flex flex-col gap-1.5">
          <h1 class="text-2xl font-semibold">Crie sua senha</h1>
          <p class="text-muted-foreground text-sm">
            Digite a senha duas vezes, para não errar sem perceber.
          </p>
        </div>

        <form novalidate class="flex flex-col gap-4" onsubmit={handleSubmit}>
          <TextField
            data={{ label: 'Nova senha', name: 'password', value: fields.password.value }}
            ui={{ type: 'password' }}
            state={{
              error: fields.password.error,
              isDisabled: isSubmitting,
              isAutoFocused: true,
            }}
            actions={{
              onChange: (value: string) => actions.onChange('password', value),
              onBlur: () => actions.onBlur('password'),
            }}
          />

          <TextField
            data={{
              label: 'Repita a nova senha',
              name: 'passwordConfirmation',
              value: fields.passwordConfirmation.value,
            }}
            ui={{ type: 'password' }}
            state={{ error: fields.passwordConfirmation.error, isDisabled: isSubmitting }}
            actions={{
              onChange: (value: string) => actions.onChange('passwordConfirmation', value),
              onBlur: () => actions.onBlur('passwordConfirmation'),
            }}
          />

          {#if state?.error}
            <ErrorState data={{ message: state.error }} ui={{ variant: 'inline' }} />
          {/if}

          <SubmitButton
            data={{ label: 'Salvar e entrar', loadingLabel: 'Salvando…' }}
            state={{ isLoading: isSubmitting }}
          />
        </form>
      {/if}
    </div>
  </div>

  <div class="bg-foreground text-background relative hidden flex-col justify-end p-14 lg:flex">
    <p class="text-2xl leading-snug font-semibold">
      Escolha uma senha que só você saiba — e que você consiga lembrar amanhã.
    </p>
  </div>
</div>
