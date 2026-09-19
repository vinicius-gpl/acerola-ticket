import { type FormFieldState } from '../ui/form-field.type';

/**
 * Traduz o estado do formulário no que a view entende: valor e erro, e nada mais.
 *
 * É esta tradução que mantém a view uma função pura de props — ela nunca vê o objeto do
 * TanStack Form, e por isso abre no Storybook em qualquer estado sem biblioteca no meio.
 */
export type FieldMetaLike = {
  errors?: readonly unknown[];
  isTouched?: boolean;
};

/**
 * O erro só aparece depois que a pessoa SAIU do campo, ou depois que ela tentou enviar.
 *
 * Mostrar antes é acusar "e-mail inválido" na primeira letra digitada, quando a pessoa
 * ainda está no meio da palavra — ela para, apaga e tenta de novo, sem nunca ter errado.
 */
export function toFieldState(
  value: unknown,
  meta: FieldMetaLike | undefined,
  isSubmitted: boolean,
): FormFieldState {
  const shouldShowError = Boolean(meta?.isTouched) || isSubmitted;

  return {
    value: typeof value === 'string' ? value : '',
    error: shouldShowError ? firstErrorMessage(meta?.errors) : null,
  };
}

/**
 * Um erro por campo, o primeiro.
 *
 * O validador devolve o erro em duas formas conforme a origem: texto puro, ou o objeto de
 * issue do Zod. Ler só uma delas faz a mensagem sumir da tela em metade dos casos — e o
 * campo fica vermelho sem dizer o porquê, que é pior do que não ficar vermelho.
 */
export function firstErrorMessage(errors: readonly unknown[] | undefined): string | null {
  for (const error of errors ?? []) {
    if (typeof error === 'string' && error !== '') return error;
    if (typeof error !== 'object' || error === null) continue;
    if (!('message' in error)) continue;

    const { message } = error as { message?: unknown };
    if (typeof message === 'string' && message !== '') return message;
  }

  return null;
}
