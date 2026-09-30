import { normalizeIp, seconds, type ThrottlerModuleOptions } from '@nestjs/throttler';

import { type Env } from '../config/env.schema';
import { isWebhookRoute } from './webhook-throttle.decorator';

/**
 * Dois baldes, um por tipo de porta:
 *
 *  - `default` — o resto da API, folgado, porque a tela faz várias chamadas por clique;
 *  - `webhook` — a porta pública do UniFi, apertada, porque ela não tem login.
 *
 * Cada balde recusa o que não é dele (`skipIf`), então a rota nunca é contada duas vezes e
 * marcar a rota com `@WebhookThrottle()` é a única coisa que troca o limite dela.
 */
export function buildRateLimitOptions(env: Env): ThrottlerModuleOptions {
  return {
    /* A mensagem é texto de tela: vai em português, como todo erro que a pessoa lê. */
    errorMessage: 'Muitas requisições em pouco tempo. Espere um instante e tente de novo.',
    /* Quem é contado: o endereço que o Express resolveu, já respeitando quantos proxies
       existem na frente (ver `API_TRUST_PROXY_HOPS`). O `normalizeIp` junta o IPv6 pelo
       prefixo da rede — sem isso, quem tem uma faixa inteira à disposição troca de endereço
       a cada requisição e a trava nunca fecha. */
    getTracker: (request: Record<string, unknown>) => normalizeIp(readIp(request)),
    throttlers: [
      {
        name: 'default',
        limit: env.API_RATE_LIMIT,
        ttl: seconds(env.API_RATE_LIMIT_TTL_SECONDS),
        skipIf: isWebhookRoute,
      },
      {
        name: 'webhook',
        limit: env.API_WEBHOOK_RATE_LIMIT,
        ttl: seconds(env.API_RATE_LIMIT_TTL_SECONDS),
        skipIf: (context) => !isWebhookRoute(context),
      },
    ],
  };
}

/**
 * Requisição sem endereço nenhum é caso de teste e de socket já fechado. Ela cai num balde
 * chamado `unknown`, compartilhado — a alternativa seria deixá-la passar sem trava, e é
 * justamente o pedido esquisito que não merece essa cortesia.
 */
function readIp(request: Record<string, unknown>): string {
  const ip = request.ip;

  return typeof ip === 'string' && ip.length > 0 ? ip : 'unknown';
}
