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

/** Mesmo banco de teste do `tasks.e2e.ts` — ver o comentário lá sobre `TEST_DATABASE_URL`. */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

const CREDENTIALS = { email: 'login-e2e@template.local', password: 'senha-correta-123' };

describe.skipIf(!testDatabaseUrl)('Auth API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.API_LOG_LEVEL = 'error';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: ['error'] });
    setupApp(app, parseEnv(process.env));
    await app.init();

    const db = app.get<Database>(DB);
    await db.execute(sql`truncate table tasks, users, sessions restart identity cascade`);
    await db.insert(users).values({
      email: CREDENTIALS.email,
      name: 'Login E2E',
      role: 'viewer',
      passwordHash: await hashPassword(CREDENTIALS.password),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  // feliz
  it('logs in with the right password, opens a session and answers /me', async () => {
    const agent = request.agent(app.getHttpServer());

    const login = await agent.post('/api/auth/login').send(CREDENTIALS).expect(200);
    expect(login.body).toEqual({
      id: expect.any(String),
      email: CREDENTIALS.email,
      name: 'Login E2E',
      role: 'viewer',
    });
    expect(login.headers['set-cookie']?.[0]).toMatch(/^session=.+; Path=\/;.*HttpOnly/);

    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body.email).toBe(CREDENTIALS.email);
  });

  it('ends the session on logout: /me stops working with the same cookie', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send(CREDENTIALS).expect(200);

    await agent.post('/api/auth/logout').expect(204);

    await agent.get('/api/auth/me').expect(401);
  });

  // triste
  it('refuses a wrong password with 401', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: CREDENTIALS.email, password: 'senha-errada' })
      .expect(401);
  });

  it('refuses an email that does not exist with the same 401', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ninguem@template.local', password: 'qualquer-coisa' })
      .expect(401);
  });

  it('refuses a malformed body naming the field, in Portuguese', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'não é um e-mail', password: '' });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(response.body.details).toContainEqual({
      field: 'email',
      message: 'Informe um e-mail válido',
    });
  });

  it('answers 401 for /me without any session', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });
});
