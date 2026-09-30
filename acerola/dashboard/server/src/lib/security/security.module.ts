import { type MiddlewareConsumer, Module, type NestModule, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { type Env } from '../config/env.schema';
import { ENV } from '../config/env.token';
import { HelmetMiddleware } from './helmet.middleware';
import { buildRateLimitOptions } from './rate-limit.options';
import { TrustProxySetup } from './trust-proxy.setup';

/**
 * O que protege a API de quem está do outro lado, junto num lugar só: cabeçalhos do
 * navegador e trava de requisição por IP.
 *
 * A trava é guard GLOBAL pelo mesmo motivo do `RolesGuard`: rota nova nasce travada, e
 * afrouxar exige escrever `@SkipThrottle()` — uma linha que aparece na revisão. O inverso
 * faria rota nova nascer aberta, e ninguém revisa a ausência de algo.
 *
 * Tudo entra por MÓDULO, e nada pelo `main.ts`: o `app.setup.ts` é arquivo protegido, e o
 * que vive só no `main.ts` não sobe no teste E2E — a API testada seria outra que a publicada.
 */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => buildRateLimitOptions(env),
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }, TrustProxySetup],
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    /* `{*path}` e não `*`: o Express 5 do Nest 11 não aceita mais o curinga solto. */
    consumer.apply(HelmetMiddleware).forRoutes({ path: '{*path}', method: RequestMethod.ALL });
  }
}
