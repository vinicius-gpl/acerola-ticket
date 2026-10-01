import { Controller, Get, Global, Module, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SkipThrottle } from '@nestjs/throttler';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { parseEnv, type Env } from '../config/env.schema';
import { ENV } from '../config/env.token';
import { SecurityModule } from './security.module';
import { WebhookThrottle } from './webhook-throttle.decorator';

/**
 * A API de verdade, com os cabeçalhos e a trava ligados — sem banco nenhum.
 *
 * É o teste que prova o que unidade não prova: que o middleware está REGISTRADO, que o guard
 * é global de fato, e que os dois baldes não se confundem. Um `SecurityModule` que compila e
 * não protege nada passaria por todos os testes de unidade deste diretório.
 *
 * Os limites são minúsculos de propósito, para o estouro caber em poucas chamadas.
 */
const env: Env = parseEnv({
  DATABASE_URL: 'postgresql://user:pass@host/db?sslmode=require',
  NEON_AUTH_URL: 'https://auth.example.com',
  R2_ACCOUNT_ID: 'conta',
  R2_ACCESS_KEY_ID: 'chave',
  R2_SECRET_ACCESS_KEY: 'segredo',
  R2_BUCKET: 'balde',
  API_RATE_LIMIT: '3',
  API_WEBHOOK_RATE_LIMIT: '1',
} as NodeJS.ProcessEnv);

/** O ambiente que o `SecurityModule` espera encontrar, sem ler `.env` de ninguém. */
@Global()
@Module({ providers: [{ provide: ENV, useValue: env }], exports: [ENV] })
class FakeConfigModule {}

@Controller('probe')
class ProbeController {
  @Get('list')
  list(): { ok: boolean } {
    return { ok: true };
  }

  @WebhookThrottle()
  @Post('webhook')
  webhook(): { ok: boolean } {
    return { ok: true };
  }

  @SkipThrottle()
  @Get('health')
  health(): { ok: boolean } {
    return { ok: true };
  }
}

@Module({ imports: [FakeConfigModule, SecurityModule], controllers: [ProbeController] })
class ProbeModule {}

describe('SecurityModule', () => {
  let app: INestApplication;

  /* Aplicação nova por teste: a trava guarda a contagem em memória, e reaproveitar a mesma
     faria um teste começar com o balde que o anterior deixou meio cheio. */
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [ProbeModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // feliz
  it('sends the browser security headers on every response', async () => {
    const response = await request(app.getHttpServer()).get('/probe/list').expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['strict-transport-security']).toContain('max-age=');
    /* Dizer qual servidor e qual framework respondem é entregar de graça a lista de falhas
       que vale a pena tentar. */
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  /* A CSP está FORA por decisão, e não por esquecimento — ver `helmet.middleware.ts`. Se
     alguém ligá-la sem desenhar nonce, `/docs` abre em branco, e é isto que avisa. */
  it('leaves the content policy out, as decided, so /docs keeps working', async () => {
    const response = await request(app.getHttpServer()).get('/probe/list').expect(200);

    expect(response.headers['content-security-policy']).toBeUndefined();
  });

  it('lets a normal amount of requests through', async () => {
    await request(app.getHttpServer()).get('/probe/list').expect(200);
    await request(app.getHttpServer()).get('/probe/list').expect(200);
    await request(app.getHttpServer()).get('/probe/list').expect(200);
  });

  it('never blocks a route that opted out, so the healthcheck cannot cause a restart', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await request(app.getHttpServer()).get('/probe/health').expect(200);
    }
  });

  // triste
  it('answers 429, in Portuguese, once the limit is past', async () => {
    await request(app.getHttpServer()).get('/probe/list').expect(200);
    await request(app.getHttpServer()).get('/probe/list').expect(200);
    await request(app.getHttpServer()).get('/probe/list').expect(200);

    const blocked = await request(app.getHttpServer()).get('/probe/list').expect(429);

    expect(blocked.body.message).toBe(
      'Muitas requisições em pouco tempo. Espere um instante e tente de novo.',
    );
  });

  /* A porta sem login fecha ANTES do resto da API — é o ponto do limite separado. */
  it('closes the webhook door earlier than the rest of the API', async () => {
    await request(app.getHttpServer()).post('/probe/webhook').send({}).expect(201);
    await request(app.getHttpServer()).post('/probe/webhook').send({}).expect(429);

    /* E o resto da API continua atendendo: são dois baldes, não um. */
    await request(app.getHttpServer()).get('/probe/list').expect(200);
  });

  it('does not count a webhook call against the rest of the API', async () => {
    await request(app.getHttpServer()).post('/probe/webhook').send({}).expect(201);

    await request(app.getHttpServer()).get('/probe/list').expect(200);
    await request(app.getHttpServer()).get('/probe/list').expect(200);
    await request(app.getHttpServer()).get('/probe/list').expect(200);
  });
});
