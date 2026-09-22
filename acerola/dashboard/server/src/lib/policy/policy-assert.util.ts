import { ForbiddenException } from '@nestjs/common';
import { type UserRole } from '@template/shared/schemas/user.schema';

import { canAttendTicket, canCreate, canModifyRecord, canRead, isAdmin } from './access.policy';

/**
 * A policy em forma de recusa — a ponte entre "pode?" e "então pare aqui".
 *
 * `access.policy.ts` continua puro de propósito: função de (quem, o quê) → booleano, sem
 * nenhuma dependência de framework, para poder ser testado sem subir nada. Quem precisa
 * TRANSFORMAR essa resposta em 403 é o service, e é este arquivo que faz a tradução.
 *
 * A mensagem é parte da regra, não enfeite. "Sem permissão" sozinho vira chamado; dizer o
 * que a pessoa estava tentando fazer é o que permite ela pedir o acesso certo — ou perceber
 * que clicou no lugar errado.
 */

export function assertCanRead(role: UserRole | null | undefined, what: string): void {
  if (canRead(role)) return;

  throw new ForbiddenException(`Seu perfil não permite consultar ${what}.`);
}

export function assertCanCreate(role: UserRole | null | undefined, what: string): void {
  if (canCreate(role)) return;

  throw new ForbiddenException(`Seu perfil não permite criar ${what}.`);
}

/** Atender um chamado: assumir, mudar a situação, registrar o que foi feito. */
export function assertCanAttendTicket(role: UserRole | null | undefined): void {
  if (canAttendTicket(role)) return;

  throw new ForbiddenException('Seu perfil não permite atender chamados.');
}

export function assertIsAdmin(role: UserRole | null | undefined, what: string): void {
  if (isAdmin(role)) return;

  throw new ForbiddenException(`${what} é uma ação de administrador.`);
}

/**
 * Alterar ou excluir um registro.
 *
 * O que outra pessoa criou só é mexido por gerente ou administrador — e a recusa diz isso
 * com todas as letras, em vez de um "sem permissão" que vira chamado.
 */
export function assertCanModifyRecord(
  role: UserRole | null | undefined,
  actorEmail: string | null | undefined,
  recordEmail: string | null | undefined,
  what: string,
): void {
  if (canModifyRecord(role, actorEmail, recordEmail)) return;

  throw new ForbiddenException(
    `${what} foi criada por outra pessoa. Só quem criou, um gerente ou um administrador pode alterá-la.`,
  );
}
