/**
 * O estado de um campo, como a view o recebe.
 *
 * A view não conhece o formulário que produziu isto — recebe valor e erro já resolvidos.
 * É o que torna possível abrir a tela no Storybook em erro, em carregamento e preenchida,
 * sem servidor e sem biblioteca de formulário no meio.
 */
export type FormFieldState = {
  value: string;
  error: string | null;
};
