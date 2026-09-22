import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { type SessionUser } from '@template/shared/schemas/user.schema';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { IdentityProvider } from '../src/lib/auth/identity.provider';
import { parseEnv } from '../src/lib/config/env.schema';
import { DB } from '../src/lib/db/db.token';
import { type Database } from '../src/lib/db/db.type';

/**
 * A API inteira, de ponta a ponta, contra um Postgres de verdade: migration, validação do
 * Zod, policy, restrição do banco e filtro de erro. É o que teste de unidade com repository
 * fingido não prova.
 *
 * O banco vem da `TEST_DATABASE_URL`, e precisa ser OUTRO — na Neon, uma branch do banco só
 * para teste. Estes testes esvaziam as tabelas antes de rodar; apontar para o banco de
 * trabalho apagaria os dados de quem estivesse usando o sistema.
 *
 * Sem `TEST_DATABASE_URL` a suíte é pulada, em vez de falhar: quem só mexeu na tela não
 * precisa de um banco na nuvem para rodar os testes.
 *
 * **O login em si não entra aqui.** Quem autentica é o Neon Auth, e depender dele faria este
 * teste precisar de uma conta de verdade, de senha guardada em algum lugar e de internet
 * para rodar. O que ele substitui é só o RECONHECIMENTO do token (`IdentityProvider`) —
 * conferir assinatura, papel e banimento é assunto de `identity.provider.test.ts` e
 * `neon-token.util.test.ts`. Daqui para baixo, tudo o que a API faz com uma identidade já
 * conhecida é real.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

const ANA: SessionUser = { id: '1', email: 'ana@empresa.com.br', name: 'Ana', role: 'user' };
const BIA: SessionUser = { id: '2', email: 'bia@empresa.com.br', name: 'Bia', role: 'user' };
const CAIO: SessionUser = { id: '3', email: 'caio@empresa.com.br', name: 'Caio', role: 'manager' };

/** Cada token de mentira vale por uma pessoa. O que não está aqui não é ninguém. */
const PEOPLE_BY_TOKEN: Record<string, SessionUser> = {
  'token-ana': ANA,
  'token-bia': BIA,
  'token-caio': CAIO,
};

class FakeIdentityProvider {
  resolve(token: string): Promise<SessionUser | null> {
    return Promise.resolve(PEOPLE_BY_TOKEN[token] ?? null);
  }
}

describe.skipIf(!testDatabaseUrl)('Tasks API (e2e)', () => {
  let app: INestApplication;

  const asAna = () => ({ Authorization: 'Bearer token-ana' });
  const asBia = () => ({ Authorization: 'Bearer token-bia' });
  const asCaio = () => ({ Authorization: 'Bearer token-caio' });

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.API_LOG_LEVEL = 'error';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(IdentityProvider)
      .useClass(FakeIdentityProvider)
      .compile();
    app = moduleRef.createNestApplication({ logger: ['error'] });
    setupApp(app, parseEnv(process.env));
    await app.init();

    /* Estado conhecido antes do primeiro teste. `RESTART IDENTITY` zera o contador de `id`
       junto: sem isso, os ids cresceriam a cada execução e qualquer asserção sobre eles só
       passaria na primeira vez. */
    await app.get<Database>(DB).execute(sql`truncate table tasks restart identity cascade`);
  });

  afterAll(async () => {
    await app.close();
  });

  // feliz
  it('creates a task and lists it, stamping the author from the identity', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/tasks')
      .set(asAna())
      .send({ title: 'Ligar para o cliente', createdBy: 'someone@else.com' })
      .expect(201);

    expect(created.body).toMatchObject({
      title: 'Ligar para o cliente',
      status: 'todo',
      createdBy: 'ana@empresa.com.br',
    });

    const list = await request(app.getHttpServer()).get('/api/tasks').set(asAna()).expect(200);

    expect(list.body.total).toBeGreaterThanOrEqual(1);
  });

  it('updates only the fields that were sent', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/tasks')
      .set(asAna())
      .send({ title: 'Revisar contrato', description: 'Cláusula 4' })
      .expect(201);

    const updated = await request(app.getHttpServer())
      .patch(`/api/tasks/${created.body.id}`)
      .set(asAna())
      .send({ status: 'done' })
      .expect(200);

    expect(updated.body).toMatchObject({ status: 'done', description: 'Cláusula 4' });
  });

  it('tells who is logged in', async () => {
    const me = await request(app.getHttpServer()).get('/api/auth/me').set(asCaio()).expect(200);

    expect(me.body).toEqual(CAIO);
  });

  it('lets a manager change a task from someone else', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/tasks')
      .set(asAna())
      .send({ title: 'Tarefa da Ana' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/tasks/${created.body.id}`)
      .set(asCaio())
      .send({ status: 'doing' })
      .expect(200);
  });

  // triste
  /* A tranca da API: sem token não se lê nem se escreve nada. */
  it('refuses a request without a token with 401', async () => {
    await request(app.getHttpServer()).get('/api/tasks').expect(401);
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('refuses a token it does not recognize with 401', async () => {
    await request(app.getHttpServer())
      .get('/api/tasks')
      .set({ Authorization: 'Bearer token-inventado' })
      .expect(401);
  });

  /* A regra que separa os papéis: tarefa de outra pessoa é intocável para quem é `user`. */
  it('refuses a plain user on a task created by someone else, with 403', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/tasks')
      .set(asAna())
      .send({ title: 'Só a Ana mexe' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/tasks/${created.body.id}`)
      .set(asBia())
      .send({ status: 'done' })
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/api/tasks/${created.body.id}`)
      .set(asBia())
      .expect(403);
  });

  it('refuses an empty title with 4xx and names the field, in Portuguese', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/tasks')
      .set(asAna())
      .send({ title: '   ' });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(response.body.message).toBe('Confira os campos destacados.');
    expect(response.body.details).toContainEqual({ field: 'title', message: 'Informe o título' });
  });

  it('answers 404 for a task that does not exist', async () => {
    await request(app.getHttpServer()).get('/api/tasks/999999').set(asAna()).expect(404);
  });
});
