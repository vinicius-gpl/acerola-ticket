import { createForm } from '@tanstack/svelte-form';
import { createMutation } from '@tanstack/svelte-query';
import { resetPasswordSchema, type ResetPasswordInput } from '@template/shared/schemas/auth.schema';
import { goto } from '$app/navigation';
import { page } from '$app/state';

import { neonAuth } from '$lib/auth/neon-auth.client';
import { toFieldState } from '$lib/hooks/form-projection/form-projection.svelte';
import { mirrorStore } from '$lib/hooks/mirror-store/mirror-store.svelte';
import { type FormFieldState } from '$lib/types/form-field.type';

export type ResetPasswordField = 'password' | 'passwordConfirmation';

export type ResetPasswordModel = {
  data: { fields: Record<ResetPasswordField, FormFieldState> };
  state: { isSubmitting: boolean; isLinkValid: boolean; error: string | null };
  actions: {
    onChange: (field: ResetPasswordField, value: string) => void;
    onBlur: (field: ResetPasswordField) => void;
    onSubmit: () => void;
  };
};

const EXPIRED = 'Este link não vale mais. Peça um novo na tela "Esqueci minha senha".';

const UNAVAILABLE =
  'Não consegui falar com o serviço de login. Confira sua internet e tente de novo.';

/**
 * "Crie sua senha": a segunda metade do caminho que começou no e-mail.
 *
 * O link traz um `token` no endereço, e é ele que prova que a pessoa abriu o e-mail dela —
 * por isso o token vem do endereço, nunca de um campo do formulário.
 *
 * Sem token (alguém digitou `/reset-password` na barra) a tela já abre dizendo que o link não
 * vale, em vez de deixar preencher dois campos para recusar no fim.
 *
 * Depois de salvar, manda para o login em vez de entrar direto: a senha acabou de mudar, e
 * digitá-la uma vez confirma, ali na hora, que ela funciona — melhor do que descobrir amanhã.
 */
export function useResetPasswordModel(): ResetPasswordModel {
  const token = page.url.searchParams.get('token')?.trim() ?? '';

  const reset = mirrorStore(
    createMutation({
      mutationFn: async (values: ResetPasswordInput) => {
        const result = await neonAuth.resetPassword({ newPassword: values.password, token });

        if (result.error) throw new Error(readResetError(result.error.status));
      },
      onSuccess: () => goto('/login'),
    }),
  );

  const form = createForm(() => ({
    defaultValues: { password: '', passwordConfirmation: '' } as ResetPasswordInput,
    validators: { onChange: resetPasswordSchema },
    onSubmit: ({ value }: { value: ResetPasswordInput }) => {
      reset.current.mutate(value);
    },
  }));

  const values = form.useSelector((state) => state.values);
  const fieldMeta = form.useSelector((state) => state.fieldMeta);
  const isSubmitted = form.useSelector((state) => state.submissionAttempts > 0);

  return {
    get data() {
      return {
        fields: {
          password: toFieldState(
            values.current.password,
            fieldMeta.current.password,
            isSubmitted.current,
          ),
          passwordConfirmation: toFieldState(
            values.current.passwordConfirmation,
            fieldMeta.current.passwordConfirmation,
            isSubmitted.current,
          ),
        },
      };
    },
    get state() {
      return {
        isSubmitting: reset.current.isPending,
        isLinkValid: token !== '',
        error: reset.current.error ? reset.current.error.message : null,
      };
    },
    actions: {
      onChange: (field, value) => form.setFieldValue(field, value as never),
      onBlur: (field) => void form.validateField(field, 'change'),
      onSubmit: () => void form.handleSubmit(),
    },
  };
}

/**
 * Link vencido é o caso comum, e tem conserto do lado da pessoa: pedir outro. Por isso ele
 * ganha uma mensagem própria, com o caminho da solução, em vez do genérico de falha.
 */
function readResetError(status: number | undefined): string {
  if (status === 400 || status === 401 || status === 403) return EXPIRED;

  return UNAVAILABLE;
}
