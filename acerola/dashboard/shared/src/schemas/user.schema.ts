import { z } from 'zod';

/**
 * Identidade — a FORMA de quem está usando o sistema, não importa de onde ela veio.
 *
 * A identidade pode chegar de três jeitos: login próprio (tabela `users`, ver
 * `server/src/lib/db/schema/users.schema.ts`), `auth-forward` (um proxy na frente injeta os
 * cabeçalhos) ou, sem nenhum dos dois configurado, ninguém entra — a requisição recebe 401
 * (`server/src/lib/auth/authentication.middleware.ts`).
 *
 * Este arquivo continua sendo só a FORMA, não o cadastro: o que o servidor precisa saber para
 * decidir permissão e para carimbar autoria. O contrato de login em si (e-mail e senha) mora
 * em `auth.schema.ts`.
 *
 * A consequência prática que mais importa: `createdBy` e `updatedBy` vêm de quem está na
 * requisição, e nunca do corpo. Isso vale com login ou sem ele.
 */
export const userRoleSchema = z.enum(['admin', 'editor', 'viewer']);

export type UserRole = z.infer<typeof userRoleSchema>;

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  editor: 'Edição',
  viewer: 'Consulta',
};

export function userRoleLabel(role: UserRole): string {
  return USER_ROLE_LABELS[role];
}

/**
 * Quem está usando o sistema agora.
 *
 * O `id` é o que o provedor de identidade mandar: com login próprio, é o `id` da tabela
 * `users` (como texto); com `auth-forward`, é o que o proxy mandou. `SessionUser` nunca carrega
 * senha nem token — só o que a policy e a autoria precisam.
 *
 * E a sessão nunca é persistida no navegador: num escritório de máquinas compartilhadas,
 * `localStorage` faria a próxima pessoa herdar a conta da anterior — inclusive o crédito do
 * trabalho dela. A sessão do login próprio vive num cookie `HttpOnly`, que o JavaScript da
 * tela nem consegue ler.
 */
export const sessionUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  role: userRoleSchema,
});

export type SessionUser = z.infer<typeof sessionUserSchema>;
