import { z } from 'zod';

/**
 * O CONTRATO do login: e-mail e senha, nada mais. Um schema, duas pontas — a API o usa como
 * DTO e Swagger (via `nestjs-zod`), a web o usa para validar o formulário e mostrar o mesmo
 * erro embaixo do campo que a API devolveria.
 *
 * Sem `min` de tamanho na senha aqui: o servidor não sabe (nem precisa saber) a política de
 * senha de uma conta que ele não cadastra pela tela. Uma senha errada ou vazia já falha no
 * login com a mesma mensagem genérica — ver `loginRequestSchema`.
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
