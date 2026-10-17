import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { asAna, asCaio, createE2eApp, type E2eApp } from './support/e2e-app.util';

/**
 * As rotas do WhatsApp e dos links assinados, de ponta a ponta: roteamento, validação, policy
 * e filtro de erro, contra um Postgres de verdade (ver `tickets.e2e.ts` para as regras do banco
 * de teste).
 *
 * O bot em si NÃO entra aqui — ele é um programa à parte, e depender dele faria este teste
 * precisar de um WhatsApp de verdade. O que se confere é o que o servidor decide sozinho: quem
 * pode vincular, quem pode editar os textos, e que as portas sem login não abrem para qualquer
 * um. As identidades do apoio são de usuário comum e de gestor: nenhuma administra.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!testDatabaseUrl)('WhatsApp API (e2e)', () => {
  let started: E2eApp;
  let app: INestApplication;

  beforeAll(async () => {
    started = await createE2eApp(testDatabaseUrl!);
    app = started.app;
    await started.truncate(
      'whatsapp_connections',
      'whatsapp_messages',
      'whatsapp_templates',
      'whatsapp_conversations',
      'whatsapp_inbound_messages',
    );
  });

  afterAll(async () => {
    await app.close();
  });

  // feliz
  /* Quem não pode vincular não recebe erro: recebe "não pode", e a tela não oferece o botão. */
  it('tells a regular user that linking is not for them, with the usage of the day', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/integrations/whatsapp/status')
      .set(asAna())
      .expect(200);

    expect(response.body).toMatchObject({
      canLink: false,
      state: 'disconnected',
      qr: null,
      phone: null,
      sentToday: 0,
    });
    expect(response.body.dailyLimit).toBeGreaterThan(0);
    expect(response.headers['cache-control']).toBe('no-store');
  });

  // triste
  it('refuses the status to who is not logged in', async () => {
    await request(app.getHttpServer()).get('/api/integrations/whatsapp/status').expect(401);
  });

  /* Escalada de privilégio: usuário comum e gestor não vinculam número nem desvinculam. */
  it('refuses to start or remove a link for who does not administer', async () => {
    await request(app.getHttpServer())
      .post('/api/integrations/whatsapp/link')
      .set(asAna())
      .expect(403);
    await request(app.getHttpServer())
      .delete('/api/integrations/whatsapp')
      .set(asCaio())
      .expect(403);
  });

  it('refuses the bot texts to anyone who is not the super admin', async () => {
    await request(app.getHttpServer())
      .get('/api/integrations/whatsapp/templates')
      .set(asCaio())
      .expect(403);
    await request(app.getHttpServer())
      .patch('/api/integrations/whatsapp/templates/ticket_ready')
      .set(asCaio())
      .send({ body: 'Olá {{nome}}!' })
      .expect(403);
  });

  /* A porta do bot não tem login, mas só abre com o token dele. */
  it('refuses the inbound route without the token of the bot', async () => {
    await request(app.getHttpServer())
      .post('/api/integrations/whatsapp/inbound')
      .send({
        sessionId: 'a'.repeat(64),
        chatId: '5562999990002@s.whatsapp.net',
        text: '/chamado',
        phone: '5562999990002',
      })
      .expect(401);
  });

  it('answers 404 for a forged invite and a forged access link', async () => {
    await request(app.getHttpServer()).get('/api/tickets/invites/forjado.assinatura').expect(404);
    await request(app.getHttpServer()).get('/api/tickets/access/forjado.assinatura').expect(404);
  });

  it('refuses an area that does not exist when asking who attends it', async () => {
    await request(app.getHttpServer())
      .get('/api/tickets/assignee-options')
      .query({ area: 'financeiro' })
      .expect(422);
  });

  it('refuses the ready notice to who is not logged in', async () => {
    await request(app.getHttpServer()).post('/api/tickets/1/whatsapp-notice').expect(401);
  });

  it('refuses the notice list and the retry to who is not logged in', async () => {
    await request(app.getHttpServer()).get('/api/tickets/1/whatsapp-notices').expect(401);
    await request(app.getHttpServer()).post('/api/tickets/1/whatsapp-notices/1/retry').expect(401);
  });
});
