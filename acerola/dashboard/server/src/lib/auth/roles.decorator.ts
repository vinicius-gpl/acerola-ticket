import { SetMetadata } from '@nestjs/common';
import { type UserRole } from '@template/shared/schemas/user.schema';

export const REQUIRED_ROLES = 'template:requiredRoles';

/**
 * Exige um dos papéis informados.
 *
 * Isto NÃO substitui a policy de `lib/policy`: ela é a regra. Este decorator existe para que a resposta
 * seja 403 com mensagem legível em vez de uma lista vazia — que é o pior resultado
 * possível: a tela mostra "nenhum registro" e a pessoa acha que o dado sumiu.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(REQUIRED_ROLES, roles);
