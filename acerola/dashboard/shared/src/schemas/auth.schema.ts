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
