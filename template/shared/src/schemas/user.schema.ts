import { z } from 'zod';

/**
 * Identidade — sem cadastro próprio, e sem tela de login.
 *
 * O template NÃO tem tabela de usuário. A identidade chega pronta por auth-forward: quem fica
 * na frente da aplicação autentica a pessoa e injeta quem ela é. Enquanto esse provedor não
 * existe, o servidor usa uma pessoa fixa (`server/src/lib/auth/identity.provider.ts`).
 *
 * Isso muda o que este arquivo é: não é o contrato de um CRUD de usuários, é a FORMA da
 * identidade que chega — o que o servidor precisa saber para decidir permissão e para
 * carimbar autoria.
 *
 * A consequência prática que mais importa: `createdBy` e `updatedBy` vêm de quem está na
 * requisição, e nunca do corpo. Não ter cadastro não afrouxa isso.
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
 * O `id` é o identificador que o provedor de identidade mandar — não uma chave nossa. Sem
 * tabela de usuário, não há registro a criar nem a manter em dia: a pessoa existe enquanto
 * a requisição dela existe.
 *
 * E a sessão nunca é persistida no navegador: num escritório de máquinas compartilhadas, a
 * próxima pessoa herdaria a conta da anterior — inclusive o crédito do trabalho dela.
 */
export const sessionUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  role: userRoleSchema,
});

export type SessionUser = z.infer<typeof sessionUserSchema>;
