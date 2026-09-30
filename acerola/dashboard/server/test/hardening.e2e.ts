import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { parseEnv } from '../src/lib/config/env.schema';

/**
 * As três travas de produção na aplicação DE VERDADE — a mesma que vai para o ar, com o
 * prefixo `/api`, o filtro de erro global e o banco de verdade atrás.
 *
 * É aqui que se prova o que os testes de unidade não alcançam: que `/api/health` existe no
 * endereço que o Traefik consulta, que ela responde depois de falar com o Postgres, e que a
 * trava de requisição recusa ANTES de a API gastar uma ida ao banco para descobrir quem pede.
 *
 * Sem `TEST_DATABASE_URL` a suíte é pulada, e não falha: quem só mexeu na tela não precisa de
 * um banco na nuvem para rodar os testes.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

/** Pequenos de propósito: o estouro precisa caber em poucas chamadas. */
const RATE_LIMIT = 6;
const WEBHOOK_RATE_LIMIT = 2;

const TOO_MANY = 'Muitas requisições em pouco tempo. Espere um instante e tente de novo.';

describe.skipIf(!testDatabaseUrl)('API hardening (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.API_LOG_LEVEL = 'error';
    process.env.API_RATE_LIMIT = String(RATE_LIMIT);
    process.env.API_WEBHOOK_RATE_LIMIT = String(WEBHOOK_RATE_LIMIT);
    /* UM proxy na frente, como em produção atrás do Traefik. É o que faz `request.ip` ser o
       endereço que chega no cabeçalho — e é como cada teste abaixo consegue o próprio balde,
       em vez de herdar a contagem do anterior. */
    process.env.API_TRUST_PROXY_HOPS = '1';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: ['error'] });
    setupApp(app, parseEnv(process.env));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  /** Um endereço por teste: baldes separados, sem ordem entre os testes deste arquivo. */
  const from = (ip: string) => ({ 'X-Forwarded-For': ip });

  // feliz
  it('answers the healthcheck only after talking to the database', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .set(from('198.51.100.1'))
      .expect(200);

    expect(response.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('sends the browser security headers, on a public route and on a protected one', async () => {
    const publicRoute = await request(app.getHttpServer())
      .get('/api/health')
      .set(from('198.51.100.2'))
      .expect(200);
    const protectedRoute = await request(app.getHttpServer())
      .get('/api/tasks')
      .set(from('198.51.100.2'))
      .expect(401);

    for (const response of [publicRoute, protectedRoute]) {
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(response.headers['referrer-policy']).toBe('no-referrer');
      expect(response.headers['x-powered-by']).toBeUndefined();
    }
  });

  /* Healthcheck bate de dez em dez segundos, para sempre. Contá-lo na trava faria o container
     ser reiniciado por excesso de perguntas sobre se ele está vivo. */
  it('never throttles the healthcheck', async () => {
    for (let attempt = 0; attempt < RATE_LIMIT + 4; attempt += 1) {
      await request(app.getHttpServer())
        .get('/api/health')
        .set(from('198.51.100.3'))
        .expect(200);
    }
  });

  // triste
  it('answers 429 in Portuguese once the limit is past', async () => {
    const ip = from('198.51.100.4');

    for (let attempt = 0; attempt < RATE_LIMIT; attempt += 1) {
      await request(app.getHttpServer()).get('/api/tasks').set(ip).expect(401);
    }

    const blocked = await request(app.getHttpServer()).get('/api/tasks').set(ip).expect(429);

    expect(blocked.body.message).toBe(TOO_MANY);
    /* O 429 chega no MESMO formato de erro do resto da API: a tela lê o motivo sempre no
       mesmo lugar. */
    expect(blocked.body).toMatchObject({ statusCode: 429, path: '/api/tasks' });
  });

  /* A trava vem antes da identidade de propósito: quem está abusando não deve custar uma
     consulta ao banco por requisição só para ser reconhecido e recusado. */
  it('refuses the abuser before asking the database who they are', async () => {
    const ip = from('198.51.100.5');

    for (let attempt = 0; attempt < RATE_LIMIT; attempt += 1) {
      await request(app.getHttpServer()).get('/api/tasks').set(ip).expect(401);
    }

    /* Sem token nenhum a resposta seria 401; ela vira 429, então a trava decidiu primeiro. */
    await request(app.getHttpServer()).get('/api/tasks').set(ip).expect(429);
  });

  it('closes the UniFi webhook door earlier than the rest of the API', async () => {
    const ip = from('198.51.100.6');

    for (let attempt = 0; attempt < WEBHOOK_RATE_LIMIT; attempt += 1) {
      /* 401: sem `UNIFI_WEBHOOK_TOKEN` configurado a porta recusa tudo — o que importa aqui
         é que a chamada FOI CONTADA no balde apertado. */
      await request(app.getHttpServer())
        .post('/api/network/webhook?token=errado')
        .set(ip)
        .send({})
        .expect(401);
    }

    const blocked = await request(app.getHttpServer())
      .post('/api/network/webhook?token=errado')
      .set(ip)
      .send({})
      .expect(429);

    expect(blocked.body.message).toBe(TOO_MANY);

    /* E o resto da API continua atendendo o mesmo endereço: são dois baldes, não um. */
    await request(app.getHttpServer()).get('/api/tasks').set(ip).expect(401);
  });
});
