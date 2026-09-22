import { type UserRole } from '@template/shared/schemas/user.schema';

/**
 * QUEM PODE O QUÊ — num lugar só.
 *
 * A conexão com o banco é única e privilegiada: o Postgres vê sempre o mesmo usuário, e não
 * tem como distinguir quem pediu do lado de cá.
 * A decisão de acesso é desta camada, e por isso ela precisa de três propriedades:
 *
 *  1. **Um lugar só.** Toda regra de quem-pode-o-quê mora aqui. `if (user.role === 'admin')`
 *     espalhado em controller é como a mesma pergunta recebe respostas diferentes em telas
 *     diferentes.
 *  2. **Fechado por padrão.** Nenhuma função devolve `true` por omissão. Perfil desconhecido
 *     não passa.
 *  3. **Testável sem banco.** São funções puras de (quem, o quê) → pode ou não.
 *
 * Os três papéis do sistema, e o que cada um ganha em relação ao anterior:
 *
 * | Papel     | Enxerga tudo | Cria | Mexe no que é seu | Mexe no dos outros | Pessoas e ajustes |
 * |-----------|--------------|------|-------------------|--------------------|-------------------|
 * | `user`    | sim          | sim  | sim               | não                | não               |
 * | `manager` | sim          | sim  | sim               | sim                | não               |
 * | `admin`   | sim          | sim  | sim               | sim                | sim               |
 *
 * O cuidado que fica com quem programa: esquecer de chamar a policy é uma porta aberta. É por
 * isso que a checagem vive no service, no mesmo lugar onde a escrita acontece, e não num
 * passo separado que alguém possa pular.
 */

const ROLES: UserRole[] = ['user', 'manager', 'admin'];

/** Quem está identificado enxerga o cadastro inteiro — os três papéis leem tudo. */
export function canRead(role: UserRole | null | undefined): boolean {
  if (!role) return false;

  return ROLES.includes(role);
}

/** Criar é de todo mundo: quem só pudesse olhar não teria por que entrar no sistema. */
export function canCreate(role: UserRole | null | undefined): boolean {
  return canRead(role);
}

export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === 'admin';
}

/**
 * Mexer no que é DOS OUTROS — alterar ou excluir registro de outra pessoa.
 *
 * É o que separa `user` de `manager`: os dois trabalham, mas só o segundo responde pelo
 * trabalho alheio.
 */
export function canManageAnyRecord(role: UserRole | null | undefined): boolean {
  return role === 'manager' || isAdmin(role);
}

/**
 * "Isto é meu?" — a comparação que decide o acesso ao próprio registro.
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

/**
 * Alterar ou excluir um registro: o seu, sempre; o de outra pessoa, só gerente ou
 * administrador.
 */
export function canModifyRecord(
  role: UserRole | null | undefined,
  actorEmail: string | null | undefined,
  recordEmail: string | null | undefined,
): boolean {
  if (!canRead(role)) return false;
  if (canManageAnyRecord(role)) return true;

  return isOwnRecord(actorEmail, recordEmail);
}
