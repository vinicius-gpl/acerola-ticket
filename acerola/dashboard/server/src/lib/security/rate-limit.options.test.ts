import { type ExecutionContext } from '@nestjs/common';
import { type ThrottlerOptions } from '@nestjs/throttler';
import { describe, expect, it } from 'vitest';

import { parseEnv } from '../config/env.schema';
import { buildRateLimitOptions } from './rate-limit.options';
import { WebhookThrottle } from './webhook-throttle.decorator';

/**
 * A trava de requisição decide, sozinha, quem é recusado em produção. Um limite lido da
 * variável errada ou um balde que não reconhece o webhook não falha em lugar nenhum: ele só
 * deixa a porta aberta em silêncio, que é o defeito que este arquivo existe para pegar.
 */
const BASE_ENV = {
  DATABASE_URL: 'postgresql://user:pass@host/db?sslmode=require',
  NEON_AUTH_URL: 'https://auth.example.com',
  R2_ACCOUNT_ID: 'conta',
  R2_ACCESS_KEY_ID: 'chave',
  R2_SECRET_ACCESS_KEY: 'segredo',
  R2_BUCKET: 'balde',
};

function envWith(overrides: Record<string, string> = {}) {
  return parseEnv({ ...BASE_ENV, ...overrides } as NodeJS.ProcessEnv);
}

/** Uma rota marcada como porta de fora, e uma comum, para o `skipIf` escolher entre elas. */
class ProbeController {
  @WebhookThrottle()
  webhook(): void {}

  list(): void {}
}

function contextFor(handler: () => void): ExecutionContext {
  return { getHandler: () => handler } as unknown as ExecutionContext;
}

function throttlerNamed(name: string, env = envWith()): ThrottlerOptions {
  const options = buildRateLimitOptions(env);
  const throttlers = Array.isArray(options) ? options : options.throttlers;
  const found = throttlers.find((throttler) => throttler.name === name);
  if (!found) throw new Error(`Throttler ${name} not configured`);

  return found;
}

const webhookContext = contextFor(ProbeController.prototype.webhook);
const listContext = contextFor(ProbeController.prototype.list);

describe('buildRateLimitOptions', () => {
  // feliz
  it('reads both limits and the window from the environment', () => {
    const env = envWith({
      API_RATE_LIMIT: '42',
      API_WEBHOOK_RATE_LIMIT: '7',
      API_RATE_LIMIT_TTL_SECONDS: '30',
    });

    expect(throttlerNamed('default', env)).toMatchObject({ limit: 42, ttl: 30_000 });
    expect(throttlerNamed('webhook', env)).toMatchObject({ limit: 7, ttl: 30_000 });
  });

  it('counts the client by the IP the framework resolved', async () => {
    const options = buildRateLimitOptions(envWith());
    const getTracker = Array.isArray(options) ? undefined : options.getTracker;

    expect(await getTracker?.({ ip: '203.0.113.9' }, listContext)).toBe('203.0.113.9');
  });

  /* Faixa de IPv6 inteira à disposição de uma pessoa é o caminho mais fácil para escapar da
     trava: o balde é a REDE, não o endereço. */
  it('buckets IPv6 by network, so changing address does not dodge the limit', async () => {
    const options = buildRateLimitOptions(envWith());
    const getTracker = Array.isArray(options) ? undefined : options.getTracker;

    const first = await getTracker?.({ ip: '2001:db8:1:2:aaaa:bbbb:cccc:dddd' }, listContext);
    const second = await getTracker?.({ ip: '2001:db8:1:2:1111:2222:3333:4444' }, listContext);

    expect(first).toBe(second);
  });

  it('sends the webhook route to the tight bucket and nothing else', () => {
    expect(throttlerNamed('webhook').skipIf?.(webhookContext)).toBe(false);
    expect(throttlerNamed('webhook').skipIf?.(listContext)).toBe(true);
  });

  it('keeps the webhook route out of the loose bucket, so it is never counted twice', () => {
    expect(throttlerNamed('default').skipIf?.(webhookContext)).toBe(true);
    expect(throttlerNamed('default').skipIf?.(listContext)).toBe(false);
  });

  // triste
  /* A trava é o que a pessoa lê quando estoura: a mensagem vai em português, como todo erro
     de tela (CONTRIBUTING §1). */
  it('refuses in Portuguese', () => {
    const options = buildRateLimitOptions(envWith());
    const message = Array.isArray(options) ? undefined : options.errorMessage;

    expect(message).toBe('Muitas requisições em pouco tempo. Espere um instante e tente de novo.');
  });

  /* Requisição sem endereço não pode virar passe livre: ela cai num balde compartilhado. */
  it('does not let a request without an IP escape the limit', async () => {
    const options = buildRateLimitOptions(envWith());
    const getTracker = Array.isArray(options) ? undefined : options.getTracker;

    expect(await getTracker?.({}, listContext)).toBe('unknown');
    expect(await getTracker?.({ ip: '' }, listContext)).toBe('unknown');
  });

  /* O webhook nunca pode herdar o limite folgado do resto da API: é a porta sem login. */
  it('keeps the webhook limit tighter than the rest, even with the defaults', () => {
    const webhook = throttlerNamed('webhook');
    const rest = throttlerNamed('default');

    expect(Number(webhook.limit)).toBeLessThan(Number(rest.limit));
  });
});
