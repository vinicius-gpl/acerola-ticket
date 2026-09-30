import { type ExecutionContext, SetMetadata } from '@nestjs/common';

export const IS_WEBHOOK_THROTTLE = 'acerola:webhookThrottle';

/**
 * Marca a rota como PORTA DE FORA: ela ganha a trava apertada do webhook em vez da folgada
 * do resto da API.
 *
 * Existe como marca na rota, e não como caminho escrito na configuração da trava, porque
 * caminho combinado em dois arquivos separados se desencontra na primeira vez que a rota
 * muda de nome — e o desencontro afrouxa a trava em silêncio.
 */
export const WebhookThrottle = () => SetMetadata(IS_WEBHOOK_THROTTLE, true);

/** Lido pela configuração da trava para decidir qual dos dois limites vale na requisição. */
export function isWebhookRoute(context: ExecutionContext): boolean {
  const handler = context.getHandler();
  if (!handler) return false;

  return Reflect.getMetadata(IS_WEBHOOK_THROTTLE, handler) === true;
}
