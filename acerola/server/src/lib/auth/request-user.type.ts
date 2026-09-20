import { type SessionUser } from '@template/shared/schemas/user.schema';

/**
 * Quem está fazendo a requisição. Sai do middleware de autenticação, sempre.
 *
 * É exatamente a `SessionUser` do contrato — sem token e sem nada a mais. A conexão com o
 * banco é uma só e privilegiada; quem decide o que cada um pode é a camada de policy, e ela
 * precisa do papel e do e-mail — não de credencial.
 *
 * A regra que importa: autoria (`createdBy`, `updatedBy`) vem DAQUI, e nunca do corpo da
 * requisição. Aceitar autoria do corpo é aceitar que alguém assine por outra pessoa.
 */
export type RequestUser = SessionUser;

/** O Express não conhece nossa propriedade; este alias evita `as any` espalhado. */
export type AuthenticatedRequest = { user?: RequestUser; headers: Record<string, unknown> };
