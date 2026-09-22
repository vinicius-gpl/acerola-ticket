import { z } from 'zod';

/**
 * O CONTRATO do formulário de login: e-mail e senha, nada mais.
 *
 * Quem recebe essas credenciais é o **Neon Auth**, não a nossa API — por isso aqui não há DTO
 * de servidor, só a validação do formulário. O schema continua em `shared/` porque o que a
 * tela valida é o que o serviço de login espera receber, e esses dois precisam combinar.
 *
 * Sem `min` de tamanho na senha: a política de senha é do Neon Auth, e repeti-la aqui criaria
 * duas regras para a mesma coisa. Senha curta ou errada volta como credencial inválida, com a
 * mesma mensagem genérica de "e-mail ou senha incorretos".
 */
export const loginRequestSchema = z.object({
  email: z
    .string({ required_error: 'Informe o e-mail' })
    .trim()
    .min(1, 'Informe o e-mail')
    .email('Informe um e-mail válido'),
  password: z.string({ required_error: 'Informe a senha' }).min(1, 'Informe a senha'),
});

export type LoginInput = z.input<typeof loginRequestSchema>;

/**
 * O CONTRATO de "esqueci minha senha": só o e-mail.
 *
 * A resposta é sempre a mesma, exista a conta ou não — dizer "esse e-mail não está cadastrado"
 * contaria a quem está tentando adivinhar quais e-mails existem no sistema.
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Informe o e-mail' })
    .trim()
    .min(1, 'Informe o e-mail')
    .email('Informe um e-mail válido'),
});

export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;

/** O tamanho mínimo de senha do Neon Auth. Repetido aqui para o erro aparecer ANTES do envio. */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * O CONTRATO de "definir nova senha": a senha e a confirmação.
 *
 * A confirmação existe porque a pessoa não vê o que digita. Sem ela, um dedo errado vira uma
 * senha que ninguém conhece — e a única saída seria repetir o processo inteiro do e-mail.
 *
 * O erro da confirmação aponta para o campo da confirmação, não para o da senha: é nele que a
 * pessoa precisa mexer.
 */
export const resetPasswordSchema = z
  .object({
    password: z
      .string({ required_error: 'Informe a nova senha' })
      .min(PASSWORD_MIN_LENGTH, `A senha precisa de pelo menos ${PASSWORD_MIN_LENGTH} caracteres`),
    passwordConfirmation: z
      .string({ required_error: 'Repita a nova senha' })
      .min(1, 'Repita a nova senha'),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    path: ['passwordConfirmation'],
    message: 'As duas senhas precisam ser iguais',
  });

export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;
