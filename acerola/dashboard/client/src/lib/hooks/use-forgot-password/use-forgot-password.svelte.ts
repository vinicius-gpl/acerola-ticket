import { createForm } from '@tanstack/svelte-form';
import { createMutation } from '@tanstack/svelte-query';
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from '@template/shared/schemas/auth.schema';

import { neonAuth } from '$lib/auth/neon-auth.client';
import { toFieldState } from '$lib/hooks/form-projection/form-projection.svelte';
import { mirrorStore } from '$lib/hooks/mirror-store/mirror-store.svelte';
import { type FormFieldState } from '$lib/types/form-field.type';

export type ForgotPasswordModel = {
  data: { field: FormFieldState };
  state: { isSubmitting: boolean; isSent: boolean; error: string | null };
  actions: {
    onChange: (value: string) => void;
    onBlur: () => void;
    onSubmit: () => void;
  };
};

const UNAVAILABLE =
  'Não consegui falar com o serviço de login. Confira sua internet e tente de novo.';

const TOO_MANY = 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.';

/** Para onde o link do e-mail traz a pessoa de volta. Precisa estar na lista de domínios
 *  confiáveis do Neon Auth — senão ele recusa o pedido inteiro, sem enviar nada. */
const RESET_PATH = '/reset-password';

/**
 * "Esqueci minha senha": manda o e-mail com o link de criar senha.
 *
 * É também o caminho de quem NUNCA teve senha — conta criada no painel da Neon nasce sem
 * senha nenhuma, e é por aqui que a pessoa define a primeira.
 *
 * O sucesso não diz se a conta existe. A tela mostra sempre "se este e-mail estiver
 * cadastrado…", e o próprio Neon Auth responde igual nos dois casos: contar a diferença
 * entregaria quais endereços têm conta a quem está tentando adivinhar.
 */
export function useForgotPasswordModel(): ForgotPasswordModel {
  const request = mirrorStore(
    createMutation({
      mutationFn: async (values: ForgotPasswordInput) => {
        const result = await neonAuth.requestPasswordReset({
          email: values.email.trim(),
          redirectTo: `${window.location.origin}${RESET_PATH}`,
        });

        /* A biblioteca não lança: devolve `error` preenchido. Sem esta conversão, uma falha
           viraria "enviado" na tela e a pessoa ficaria esperando um e-mail que não saiu. */
        if (result.error) throw new Error(readRequestError(result.error.status));
      },
    }),
  );

  const form = createForm(() => ({
    defaultValues: { email: '' } as ForgotPasswordInput,
    validators: { onChange: forgotPasswordSchema },
    onSubmit: ({ value }: { value: ForgotPasswordInput }) => {
      request.current.mutate(value);
    },
  }));

  const values = form.useSelector((state) => state.values);
  const fieldMeta = form.useSelector((state) => state.fieldMeta);
  const isSubmitted = form.useSelector((state) => state.submissionAttempts > 0);

  return {
    get data() {
      return {
        field: toFieldState(values.current.email, fieldMeta.current.email, isSubmitted.current),
      };
    },
    get state() {
      return {
        isSubmitting: request.current.isPending,
        isSent: request.current.isSuccess,
        error: request.current.error ? request.current.error.message : null,
      };
    },
    actions: {
      onChange: (value) => form.setFieldValue('email', value),
      onBlur: () => void form.validateField('email', 'change'),
      onSubmit: () => void form.handleSubmit(),
    },
  };
}

/**
 * Limite de tentativas não é a mesma coisa que serviço fora do ar.
 *
 * Quem clicou três vezes seguidas precisa saber que é só esperar; mandar "confira sua
 * internet" faria a pessoa procurar problema onde não há.
 */
function readRequestError(status: number | undefined): string {
  if (status === 429) return TOO_MANY;

  return UNAVAILABLE;
}
