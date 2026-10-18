import { SetMetadata } from '@nestjs/common';
import { type RoleContext } from '@template/shared/domain/role-context.util';

export const MODULE_CONTEXT = 'template:moduleContext';
export const ANY_MODULE = 'template:anyModule';

/**
 * Diz de QUAL MÓDULO é a rota — Infraestrutura, Sistema ou Manutenção.
 *
 * Com isto, o `RolesGuard` recusa quem não tem o módulo (403) e recusa escrita de quem só
 * consulta (403), antes de a requisição chegar ao service. A regra está em
 * `domain/module-access.util.ts`: Gestor e Administrador do módulo alteram; Usuário só lê.
 */
export const ModuleContext = (context: RoleContext) => SetMetadata(MODULE_CONTEXT, context);

/**
 * A rota NÃO é de um módulo só, e quem decide é o service — ex.: os chamados, que pertencem à
 * área de cada um, ou "quem sou eu". Basta estar identificado para chegar ao service.
 *
 * Existe para a ausência ser uma DECISÃO escrita: rota sem `@ModuleContext()` e sem isto é
 * recusada pelo guard, e é assim que rota nova nasce fechada.
 */
export const AnyModule = () => SetMetadata(ANY_MODULE, true);
