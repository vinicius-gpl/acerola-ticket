/**
 * Os CONTEXTOS do sistema — as áreas internas em que uma pessoa pode ter um cargo diferente.
 *
 * Mora no domínio, e não em `schemas/user.schema.ts` (de onde saiu), porque deixou de ser só
 * sobre cargo: o chamado (#13) também é separado por este mesmo contexto, e schema de chamado
 * não pode depender de schema de usuário sem criar um ciclo. `user.schema.ts` reexporta tudo
 * daqui para quem já importava de lá continuar funcionando.
 */
export const ROLE_CONTEXTS = ['infra', 'sistema', 'manutencao'] as const;

export type RoleContext = (typeof ROLE_CONTEXTS)[number];

export const ROLE_CONTEXT_LABELS: Record<RoleContext, string> = {
  infra: 'Infraestrutura',
  sistema: 'Sistema',
  manutencao: 'Manutenção',
};

export function roleContextLabel(context: RoleContext): string {
  return ROLE_CONTEXT_LABELS[context];
}

export function isRoleContext(value: unknown): value is RoleContext {
  return typeof value === 'string' && (ROLE_CONTEXTS as readonly string[]).includes(value);
}

export function roleContextOptions(): { value: RoleContext; label: string }[] {
  return ROLE_CONTEXTS.map((value) => ({ value, label: ROLE_CONTEXT_LABELS[value] }));
}
