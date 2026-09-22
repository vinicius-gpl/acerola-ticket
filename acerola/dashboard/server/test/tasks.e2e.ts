import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { hashPassword } from '../src/lib/auth/password.util';
import { parseEnv } from '../src/lib/config/env.schema';
import { DB } from '../src/lib/db/db.token';
import { type Database } from '../src/lib/db/db.type';
import { users } from '../src/lib/db/schema/users.schema';

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
 * precisa de um banco na nuvem para rodar os testes. No SQLite isso não era questão — o
 * banco em memória nascia com o processo —, e é o preço de sair de um banco local.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

const TEST_ADMIN = { email: 'e2e-admin@template.local', password: 'e2e-teste-123' };

describe.skipIf(!testDatabaseUrl)('Tasks API (e2e)', () => {
  let app: INestApplication;
  /* Um `agent` do supertest guarda cookie entre chamadas — é o que faz a sessão aberta no
     login valer para as chamadas seguintes, do mesmo jeito que o navegador faria. */
  let admin: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.API_LOG_LEVEL = 'error';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: ['error'] });
    setupApp(app, parseEnv(process.env));
    await app.init();

    /* Estado conhecido antes do primeiro teste. `RESTART IDENTITY` zera o contador de `id`
       junto: sem isso, os ids cresceriam a cada execução e qualquer asserção sobre eles só
       passaria na primeira vez. */
    const db = app.get<Database>(DB);
    await db.execute(sql`truncate table tasks, users, sessions restart identity cascade`);
    await db.insert(users).values({
      email: TEST_ADMIN.email,
      name: 'Admin de teste',
      role: 'admin',
      passwordHash: await hashPassword(TEST_ADMIN.password),
    });

    admin = request.agent(app.getHttpServer());
    await admin.post('/api/auth/login').send(TEST_ADMIN).expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  // feliz
  it('creates a task and lists it, stamping the author from the identity', async () => {
    const created = await admin
      .post('/api/tasks')
      .send({ title: 'Ligar para o cliente', createdBy: 'someone@else.com' })
      .expect(201);

    expect(created.body).toMatchObject({
      title: 'Ligar para o cliente',
      status: 'todo',
      createdBy: TEST_ADMIN.email,
    });

    const list = await admin.get('/api/tasks').expect(200);

    expect(list.body.total).toBeGreaterThanOrEqual(1);
  });

  it('updates only the fields that were sent', async () => {
    const created = await admin
      .post('/api/tasks')
      .send({ title: 'Revisar contrato', description: 'Cláusula 4' })
      .expect(201);

    const updated = await admin
      .patch(`/api/tasks/${created.body.id}`)
      .send({ status: 'done' })
      .expect(200);

    expect(updated.body).toMatchObject({ status: 'done', description: 'Cláusula 4' });
  });

  // triste
  it('refuses an empty title with 4xx and names the field, in Portuguese', async () => {
    const response = await admin.post('/api/tasks').send({ title: '   ' });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(response.body.message).toBe('Confira os campos destacados.');
    expect(response.body.details).toContainEqual({ field: 'title', message: 'Informe o título' });
  });

  it('refuses an unauthenticated request with 401', async () => {
    await request(app.getHttpServer()).get('/api/tasks').expect(401);
  });

  /* Escalada de privilégio: o papel que chega pelo cabeçalho manda, e viewer não escreve. */
  it('refuses a viewer with 403', async () => {
    await request(app.getHttpServer())
      .post('/api/tasks')
      .set('x-forwarded-user-id', '9')
      .set('x-forwarded-user-email', 'bia@empresa.com.br')
      .set('x-forwarded-user-name', 'Bia')
      .set('x-forwarded-user-role', 'viewer')
      .send({ title: 'Não deveria entrar' })
      .expect(403);
  });

  /* Cabeçalho pela metade NÃO substitui a exigência de identidade por um acesso qualquer. */
  it('refuses a half-forwarded identity with 401', async () => {
    await request(app.getHttpServer())
      .get('/api/tasks')
      .set('x-forwarded-user-email', 'bia@empresa.com.br')
      .expect(401);
  });

  it('answers 404 for a task that does not exist', async () => {
    await admin.get('/api/tasks/999999').expect(404);
  });
});
