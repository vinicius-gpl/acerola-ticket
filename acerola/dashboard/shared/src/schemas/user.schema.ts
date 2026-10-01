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
export const userRoleSchema = z.enum(['user', 'manager', 'admin', 'superadmin']);

export type UserRole = z.infer<typeof userRoleSchema>;

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  user: 'Usuário',
  manager: 'Gestor',
  admin: 'Administrador',
  superadmin: 'Super Admin',
};

export function userRoleLabel(role: UserRole): string {
  return USER_ROLE_LABELS[role];
}

/** O papel de quem entrou sem papel definido no Neon Auth: o mais restrito que existe. */
export const DEFAULT_USER_ROLE: UserRole = 'user';

/**
 * Contextos do sistema nos quais um usuário pode possuir papéis/cargos diferentes.
 *
 * Exemplo: no contexto de infraestrutura o usuário pode ser 'user', em manutenção 'manager'
 * e no sistema interno 'admin'.
 */
export const ROLE_CONTEXTS = ['infra', 'sistema', 'manutencao'] as const;

export type RoleContext = (typeof ROLE_CONTEXTS)[number];

export const roleContextSchema = z.enum(ROLE_CONTEXTS);

export const ROLE_CONTEXT_LABELS: Record<RoleContext, string> = {
  infra: 'Infraestrutura',
  sistema: 'Sistema',
  manutencao: 'Manutenção',
};

export function roleContextLabel(context: RoleContext): string {
  return ROLE_CONTEXT_LABELS[context];
}

export const contextRolesSchema = z.object({
  infra: userRoleSchema.default('user'),
  sistema: userRoleSchema.default('user'),
  manutencao: userRoleSchema.default('user'),
});

export type ContextRoles = z.infer<typeof contextRolesSchema>;

/**
 * Retorna o papel do usuário dentro de um contexto específico.
 * Se não houver papel atribuído naquele contexto, recorre ao papel geral ou 'user'.
 */
export function roleInContext(
  user: { role?: UserRole | null; roles?: Partial<ContextRoles> | null } | null | undefined,
  context: RoleContext,
): UserRole {
  if (!user) return DEFAULT_USER_ROLE;

  return user.roles?.[context] ?? user.role ?? DEFAULT_USER_ROLE;
}

/**
 * Quem está usando o sistema agora.
 *
 * O `id` é o id da pessoa no provedor de autenticação (`neon_auth.user.id` ou proxy auth-forward).
 * O `role` representa o papel principal/sistema, enquanto `roles` traz a separação por contexto.
 * `SessionUser` nunca carrega senha nem token — só o que a policy e a autoria precisam.
 */
export const sessionUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  image: z.string().nullable().optional(),
  role: userRoleSchema,
  roles: contextRolesSchema.optional(),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;

/**
 * Usuário retornado pelo diretório de autenticação (Neon Auth ou auth-forward).
 * Usado em listagens de pessoas e seleção em formulários de atribuição de cargos.
 */
export const directoryUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  image: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  banned: z.boolean().nullable().optional(),
  createdAt: z.string().datetime().nullable().optional(),
});

export type DirectoryUser = z.infer<typeof directoryUserSchema>;
