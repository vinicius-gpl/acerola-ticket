import { type MiddlewareConsumer, Module, type NestModule, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { ENV } from '../config/env.token';
import { type Env } from '../config/env.schema';
import { AuthenticationMiddleware } from './authentication.middleware';
import { IdentityProvider } from './identity.provider';
import { NEON_TOKEN_VERIFIER } from './neon-token.token';
import { createNeonTokenVerifier, type NeonTokenVerifier } from './neon-token.util';
import { RolesGuard } from './roles.guard';

/**
 * Duas perguntas, dois mecanismos, nesta ordem:
 *
 *  1. **Middleware — quem é você.** Roda em toda rota, confere o token do Neon Auth e carimba
 *     a identidade na requisição. Vale para o sistema inteiro e não muda por rota.
 *  2. **Guard — o que você pode.** Recusa quem não se identificou, lê `@Roles()` e decide por
 *     rota.
 *
 * O guard é global para que rota nova nasça protegida: sem `@Roles()` ela exige apenas estar
 * identificado, e restringir é acrescentar uma linha que aparece na revisão de PR. O inverso
 * — guard por controller — faz rota nova nascer aberta, e ninguém revisa a ausência de algo.
 */
@Module({
  providers: [
    /* Montado UMA vez na partida: o verificador guarda as chaves públicas da Neon em memória
       e só volta lá quando ela troca de chave. Um por requisição seria uma ida à internet a
       cada clique da pessoa. */
    {
      provide: NEON_TOKEN_VERIFIER,
      inject: [ENV],
      useFactory: (env: Env): NeonTokenVerifier => createNeonTokenVerifier(env.NEON_AUTH_URL),
    },
    IdentityProvider,
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [IdentityProvider],
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
