import { ROLE_CONTEXTS, type RoleContext } from './role-context.util';

/**
 * A REGRA DE ACESSO POR MÓDULO — Infraestrutura · Sistema · Manutenção.
 *
 * O super-admin libera o módulo para a pessoa na tela de Acessos, já com o nível dela ali
 * (Usuário, Gestor ou Administrador). TER o módulo é o que esta regra decide; o que cada
 * nível faz lá dentro é a régua de `server/src/lib/policy/access.policy.ts`, aplicada com o
 * nível DAQUELE módulo.
 *
 * MÓDULO AUSENTE É SEM ACESSO, e não "acesso mínimo": agora que toda pessoa da empresa tem
 * conta (abrir chamado exige login), um padrão `user` daria leitura dos computadores, do
 * orçamento e das manutenções a qualquer um. Sem módulo nenhum, a pessoa abre chamado e
 * valida documento. O super-admin (pelo comando `user:promote`) tem todos, sem linha nenhuma.
 *
 * Mora em `shared` porque a tela pergunta a mesma coisa para esconder o que não vai
 * funcionar — mas quem DECIDE é o servidor (`RolesGuard`); a tela só evita o clique que daria
 * 403.
 */

type ModuleUser = {
  role?: string | null;
  roles?: Partial<Record<RoleContext, string>> | null;
};

/** A pessoa tem este módulo? O super-admin tem todos. */
export function hasModule(user: ModuleUser | null | undefined, context: RoleContext): boolean {
  if (!user) return false;
  if (user.role === 'superadmin') return true;

  return Boolean(user.roles?.[context]);
}

/** Os módulos que a pessoa tem, na ordem do menu. */
export function modulesOf(user: ModuleUser | null | undefined): RoleContext[] {
  return ROLE_CONTEXTS.filter((context) => hasModule(user, context));
}
