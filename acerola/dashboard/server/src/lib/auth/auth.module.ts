import { type MiddlewareConsumer, Module, type NestModule, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AuthenticationMiddleware } from './authentication.middleware';
import { RolesGuard } from './roles.guard';
import { SessionRepository } from './session.repository';

/**
 * Duas perguntas, dois mecanismos, nesta ordem:
 *
 *  1. **Middleware — quem é você.** Roda em toda rota, resolve a identidade e recusa quando
 *     não há nenhuma. Vale para o sistema inteiro e não muda por rota.
 *  2. **Guard — o que você pode.** Lê `@Roles()` e decide por rota.
 *
 * O guard é global para que rota nova nasça protegida: sem `@Roles()` ela exige apenas estar
 * identificado, e restringir é acrescentar uma linha que aparece na revisão de PR. O inverso
 * — guard por controller — faz rota nova nascer aberta, e ninguém revisa a ausência de algo.
 */
@Module({
  providers: [{ provide: APP_GUARD, useClass: RolesGuard }, SessionRepository],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    /* `{*path}` e não `'*'`: o Express 5 do Nest 11 não aceita mais o curinga solto, e o
       conversor de rota legada avisa no log a cada partida. */
    consumer
      .apply(AuthenticationMiddleware)
      .forRoutes({ path: '{*path}', method: RequestMethod.ALL });
  }
}
