import { type UserRole } from '@template/shared/schemas/user.schema';

/**
 * QUEM PODE O QUÊ — num lugar só.
 *
 * A conexão com o banco é única e privilegiada: o SQLite não tem como distinguir quem pediu.
 * A decisão de acesso é desta camada, e por isso ela precisa de três propriedades:
 *
 *  1. **Um lugar só.** Toda regra de quem-pode-o-quê mora aqui. `if (user.role === 'admin')`
 *     espalhado em controller é como a mesma pergunta recebe respostas diferentes em telas
 *     diferentes.
 *  2. **Fechado por padrão.** Nenhuma função devolve `true` por omissão. Perfil desconhecido
 *     não passa.
 *  3. **Testável sem banco.** São funções puras de (quem, o quê) → pode ou não.
 *
 * O cuidado que fica com quem programa: esquecer de chamar a policy é uma porta aberta. É por
 * isso que a checagem vive no service, no mesmo lugar onde a escrita acontece, e não num
 * passo separado que alguém possa pular.
 */

/** Quem está identificado enxerga o cadastro inteiro. */
export function canRead(role: UserRole | null | undefined): boolean {
  if (!role) return false;

  return role === 'admin' || role === 'editor' || role === 'viewer';
}

/** `viewer` é somente leitura. */
export function canEdit(role: UserRole | null | undefined): boolean {
  return role === 'admin' || role === 'editor';
}

export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === 'admin';
}

/** Excluir não tem volta: é decisão de administrador. */
export function canDelete(role: UserRole | null | undefined): boolean {
  return isAdmin(role);
}

/**
 * "Isto é meu?" — a comparação que decide remoção do que a própria pessoa criou.
 *
 * Compara sem diferenciar caixa porque e-mail não diferencia: gravar "Ana@empresa.com.br" e
 * comparar com "ana@..." faria a pessoa perder o acesso ao que ela mesma escreveu.
 */
export function isOwnRecord(
  actorEmail: string | null | undefined,
  recordEmail: string | null | undefined,
): boolean {
  if (!actorEmail) return false;
  if (!recordEmail) return false;

  return actorEmail.trim().toLowerCase() === recordEmail.trim().toLowerCase();
}

/** Remover o que é seu, ou ser administrador. O que é de outra pessoa, só o administrador. */
export function canRemoveOwnRecord(
  role: UserRole | null | undefined,
  actorEmail: string | null | undefined,
  recordEmail: string | null | undefined,
): boolean {
  if (isAdmin(role)) return true;
  if (!canEdit(role)) return false;

  return isOwnRecord(actorEmail, recordEmail);
}
