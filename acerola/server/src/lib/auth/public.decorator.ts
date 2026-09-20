import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'template:isPublic';

/**
 * Libera uma rota da autenticação.
 *
 * O guard é global de propósito: rota nova nasce protegida, e abrir exceção exige
 * escrever isto aqui — uma linha que aparece na revisão de PR. O inverso (guard por
 * controller) faz rota nova nascer aberta, e ninguém revisa a ausência de algo.
 */
export const Public = () => SetMetadata(IS_PUBLIC, true);
