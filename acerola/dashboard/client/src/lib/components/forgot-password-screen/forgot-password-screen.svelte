<script lang="ts" module>
  import { type FormFieldState } from '$lib/types/form-field.type';

  /**
   * A tela de "esqueci minha senha" — a mesma moldura da tela de login, porque é o mesmo
   * momento para quem usa: alguém parado na porta, tentando entrar.
   *
   * Função pura de props (CONTRIBUTING §3). O estado `isSent` existe para a tela trocar o
   * formulário pelo aviso de "olhe seu e-mail" sem precisar de outra rota — a pessoa continua
   * onde estava, e o botão de voltar ao login fica à mão.
   */
  export type ForgotPasswordScreenProps = {
    data: { field: FormFieldState };
    state?: { isSubmitting?: boolean; isSent?: boolean; error?: string | null };
    actions: {
      onChange: (value: string) => void;
      onBlur: () => void;
      onSubmit: () => void;
    };
  };
</script>

<script lang="ts">
  import BrandMark from '$lib/components/brand-mark/brand-mark.svelte';
  import ErrorState from '$lib/components/error-state/error-state.svelte';
  import SubmitButton from '$lib/components/submit-button/submit-button.svelte';
  import TextField from '$lib/components/text-field/text-field.svelte';

  let { data, state, actions }: ForgotPasswordScreenProps = $props();

  const isSubmitting = $derived(Boolean(state?.isSubmitting));
  const isSent = $derived(Boolean(state?.isSent));

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    actions.onSubmit();
  }
</script>

<div class="bg-background grid min-h-svh lg:grid-cols-2">
  <div class="flex items-center justify-center p-6 sm:p-10">
    <div class="flex w-full max-w-sm flex-col gap-6">
      <BrandMark ui={{ size: 'lg' }} />

      {#if isSent}
        <div class="flex flex-col gap-1.5">
          <h1 class="text-2xl font-semibold">Confira seu e-mail</h1>
          <p class="text-muted-foreground text-sm">
            Se este e-mail estiver cadastrado, enviamos um link para você criar sua senha. O link
            vale por 15 minutos.
          </p>
        </div>

        <!-- O aviso NÃO confirma se a conta existe: dizer "não encontramos esse e-mail"
             entregaria quais endereços têm conta a quem está tentando adivinhar. -->
        <p class="text-muted-foreground text-sm">
          Não chegou? Veja a caixa de spam e confira se digitou o endereço certo.
        </p>

        <a href="/login" class="text-primary text-sm font-medium underline-offset-4 hover:underline">
          Voltar para a tela de entrada
        </a>
      {:else}
        <div class="flex flex-col gap-1.5">
          <h1 class="text-2xl font-semibold">Esqueceu sua senha?</h1>
          <p class="text-muted-foreground text-sm">
            Digite seu e-mail e enviaremos um link para você criar uma nova.
          </p>
        </div>

        <form novalidate class="flex flex-col gap-4" onsubmit={handleSubmit}>
          <TextField
            data={{
              label: 'E-mail',
              name: 'email',
              value: data.field.value,
              placeholder: 'voce@empresa.com',
            }}
            ui={{ type: 'email' }}
            state={{
              error: data.field.error,
              isDisabled: isSubmitting,
              isAutoFocused: true,
            }}
            actions={{
              onChange: (value: string) => actions.onChange(value),
              onBlur: () => actions.onBlur(),
            }}
          />

          {#if state?.error}
            <ErrorState data={{ message: state.error }} ui={{ variant: 'inline' }} />
          {/if}

          <SubmitButton
            data={{ label: 'Enviar o link', loadingLabel: 'Enviando…' }}
            state={{ isLoading: isSubmitting }}
          />
        </form>

        <a href="/login" class="text-primary text-sm font-medium underline-offset-4 hover:underline">
          Voltar para a tela de entrada
        </a>
      {/if}
    </div>
  </div>

  <!-- Escondido abaixo de `lg`, pelo mesmo motivo da tela de login: numa tela pequena o
       formulário já ocupa o espaço inteiro. -->
  <div class="bg-foreground text-background relative hidden flex-col justify-end p-14 lg:flex">
    <p class="text-2xl leading-snug font-semibold">
      Sua senha é só sua: nem quem administra o sistema consegue vê-la.
    </p>
  </div>
</div>
