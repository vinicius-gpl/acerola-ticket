import { createForm } from '@tanstack/svelte-form';
import { createMutation } from '@tanstack/svelte-query';
import { loginRequestSchema, type LoginInput } from '@template/shared/schemas/auth.schema';
import { goto } from '$app/navigation';

import { neonAuth } from '$lib/auth/neon-auth.client';
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
 * A MESMA mensagem para "e-mail não existe" e "senha errada" — de propósito.
 *
 * Mensagens diferentes confirmariam para quem está tentando adivinhar que um e-mail
 * específico tem conta no sistema. É a diferença entre "senha errada" (vaza que a conta
 * existe) e "e-mail ou senha incorretos" (não vaza nada).
 */
const INVALID_CREDENTIALS = 'E-mail ou senha incorretos.';

const UNAVAILABLE =
  'Não consegui falar com o serviço de login. Confira sua internet e tente de novo.';

/**
 * O login: e-mail, senha, entrar.
 *
 * Quem confere a senha é o **Neon Auth**, direto daqui — a nossa API não participa e nunca vê
 * a senha de ninguém. Deu certo, a sessão passa a existir no navegador e `/tasks` já abre;
 * a guarda de rota confirma com `/api/auth/me` e é ali que o papel da pessoa aparece.
 *
 * Mesmo padrão do `useTaskFormModel`: o MESMO schema que valida o formulário, TanStack Form
 * para o estado dos campos, `mirrorStore` para a mutação virar runes. E o `goto` mora aqui,
 * não no componente (CONTRIBUTING §3) — navegação é decisão do hook.
 */
export function useLoginModel(): LoginModel {
  const login = mirrorStore(
    createMutation({
      mutationFn: async (values: LoginInput) => {
        const result = await neonAuth.signIn.email({
          email: values.email.trim(),
          password: values.password,
        });

        /* A biblioteca NÃO lança em credencial errada: ela devolve `error` preenchido. Sem
           esta conversão, senha errada passaria como sucesso e a tela navegaria para uma
           `/tasks` que a guarda devolveria para cá — um pisca-pisca sem explicação. */
        if (result.error) throw new Error(readSignInError(result.error.status));
      },
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
      return {
        isSubmitting: login.current.isPending,
        error: login.current.error ? login.current.error.message : null,
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
 * Serviço fora do ar não é senha errada.
 *
 * Mandar a pessoa "conferir a senha" quando o problema é a internet faz ela digitar de novo
 * três vezes antes de desconfiar. Só o que o Neon Auth recusa por credencial vira
 * `INVALID_CREDENTIALS`.
 */
function readSignInError(status: number | undefined): string {
  if (status === 401 || status === 403 || status === 400) return INVALID_CREDENTIALS;

  return UNAVAILABLE;
}
