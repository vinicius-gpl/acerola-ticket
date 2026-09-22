import { z } from 'zod';

/**
 * Identidade — a FORMA de quem está usando o sistema.
 *
 * Quem autentica é o **Neon Auth**: a tela manda e-mail e senha direto para lá, recebe um
 * token assinado e o envia à API a cada requisição. A API confere a assinatura (JWKS) e lê o
 * cadastro em `neon_auth.user`, no mesmo banco. Este arquivo não é o cadastro — é só o que o
 * servidor precisa para decidir permissão e carimbar autoria.
 *
 * A consequência prática que mais importa: `createdBy` e `updatedBy` vêm de quem está na
 * requisição, e nunca do corpo.
 */

/**
 * Os três papéis do sistema, do menor para o maior.
 *
 * Eles moram na coluna `role` de `neon_auth.user` e são trocados no painel da Neon — o
 * sistema lê, nunca escreve. Papel desconhecido (ou vazio) cai em `user`, o mais restrito:
 * quem chega sem papel definido precisa receber MENOS acesso, nunca mais.
 */
export const userRoleSchema = z.enum(['user', 'manager', 'admin']);

export type UserRole = z.infer<typeof userRoleSchema>;

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  user: 'Usuário',
  manager: 'Gerente',
  admin: 'Administrador',
};

export function userRoleLabel(role: UserRole): string {
  return USER_ROLE_LABELS[role];
}

/** O papel de quem entrou sem papel definido no Neon Auth: o mais restrito que existe. */
export const DEFAULT_USER_ROLE: UserRole = 'user';

/**
 * Quem está usando o sistema agora.
 *
 * O `id` é o id da pessoa no Neon Auth (`neon_auth.user.id`), que é o `sub` do token.
 * `SessionUser` nunca carrega senha nem token — só o que a policy e a autoria precisam.
 *
 * A sessão não é guardada por nós: quem a mantém é o Neon Auth, no navegador. Nossa API é
 * sem estado — cada requisição chega com o token e é conferida do zero.
 */
export const sessionUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  role: userRoleSchema,
});

export type SessionUser = z.infer<typeof sessionUserSchema>;
