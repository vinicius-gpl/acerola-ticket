import { createForm } from '@tanstack/svelte-form';
import { createMutation } from '@tanstack/svelte-query';
import { loginRequestSchema, type LoginInput } from '@template/shared/schemas/auth.schema';
import { goto } from '$app/navigation';

import { authApi } from '$lib/api/auth.api';
import { readError } from '$lib/api/http-client';
import { toFieldState } from '$lib/hooks/form-projection/form-projection.svelte';
import { mirrorStore } from '$lib/hooks/mirror-store/mirror-store.svelte';
import { type FormFieldState } from '$lib/types/form-field.type';

export type LoginField = 'email' | 'password';

export type LoginModel = {
  data: { fields: Record<LoginField, FormFieldState> };
  state: { isSubmitting: boolean; error: string | null };
  actions: {
    onChange: (field: LoginField, value: string) => void;
    onBlur: (field: LoginField) => void;
    onSubmit: () => void;
  };
};

/**
 * O login: e-mail, senha, entrar. Mesmo padrão do `useTaskFormModel` — o MESMO schema que a
 * API valida, TanStack Form para o estado dos campos, `mirrorStore` para a mutação virar runes.
 *
 * Sucesso navega para `/tasks`: não há nada para mostrar na tela de login depois de logar, e
 * `goto` aqui (não no componente) é o que o CONTRIBUTING §3 pede — navegação é decisão do
 * hook, nunca do componente de UI.
 */
export function useLoginModel(): LoginModel {
  const login = mirrorStore(
    createMutation({
      mutationFn: (values: LoginInput) => authApi.login(values),
      onSuccess: () => goto('/tasks'),
    }),
  );

  const form = createForm(() => ({
    defaultValues: { email: '', password: '' } as LoginInput,
    /* Um validador só, em `onChange` — ver o comentário em `use-task-form.svelte.ts` sobre por
       que também validar em `onSubmit` prendia o erro na tela depois de um envio vazio. */
    validators: { onChange: loginRequestSchema },
    onSubmit: ({ value }: { value: LoginInput }) => {
      login.current.mutate(value);
    },
  }));

  const values = form.useSelector((state) => state.values);
  const fieldMeta = form.useSelector((state) => state.fieldMeta);
  const isSubmitted = form.useSelector((state) => state.submissionAttempts > 0);

  return {
    get data() {
      return {
        fields: {
          email: toFieldState(values.current.email, fieldMeta.current.email, isSubmitted.current),
          password: toFieldState(
            values.current.password,
            fieldMeta.current.password,
            isSubmitted.current,
          ),
        },
      };
    },
    get state() {
      return { isSubmitting: login.current.isPending, error: readError(login.current.error) };
    },
    actions: {
      onChange: (field, value) => form.setFieldValue(field, value as never),
      onBlur: (field) => void form.validateField(field, 'change'),
      onSubmit: () => void form.handleSubmit(),
    },
  };
}
