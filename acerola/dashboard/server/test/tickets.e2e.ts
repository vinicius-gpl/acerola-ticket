import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { asBia, asCaio, createE2eApp, type E2eApp } from './support/e2e-app.util';

/**
 * O FLUXO DO CHAMADO de ponta a ponta, que é onde o sistema realmente trabalha.
 *
 * É o mais valioso dos três porque tem mais peças que podem se desencontrar: uma porta pública
 * sem identidade, uma porta protegida, arquivos de dois donos diferentes e uma projeção que
 * esconde campos. Nada disso é provado por teste de service com repository fingido — ali a
 * porta pública e a protegida são a mesma chamada de função.
 *
 * Sem `TEST_DATABASE_URL` a suíte é pulada, e não falha: quem só mexeu na tela não precisa de
 * um banco para rodar os testes.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

/** O mínimo que o portal público exige para abrir um chamado. */
const PEDIDO = {
  requesterName: 'Marta da Recepção',
  department: 'recepcao',
  problemType: 'printer',
  contactPhone: '62 99999-1234',
  description: 'A impressora da recepção não puxa papel desde ontem.',
};

/** Arquivos inventados — o conteúdo não importa; o formato e o nome, sim. */
const NOTA_FISCAL = Buffer.from('%PDF-1.4 nota fiscal de mentira');
const PRINT = Buffer.from('PNG de mentira');
const ORCAMENTO = Buffer.from('%PDF-1.4 orcamento de mentira');

const PDF = 'application/pdf';

describe.skipIf(!testDatabaseUrl)('Tickets API (e2e)', () => {
  let started: E2eApp;
  let app: INestApplication;

  const openTicket = () =>
    request(app.getHttpServer())
      .post('/api/tickets')
      .field('requesterName', PEDIDO.requesterName)
      .field('department', PEDIDO.department)
      .field('problemType', PEDIDO.problemType)
      .field('contactPhone', PEDIDO.contactPhone)
      .field('description', PEDIDO.description);

  beforeAll(async () => {
    started = await createE2eApp(testDatabaseUrl!);
    app = started.app;
  });

  /* Cada teste começa com as tabelas vazias e o contador de `id` em 1: o protocolo é derivado
     do id, e sem isto uma asserção sobre `CH-0001` só passaria na primeira execução. Os anexos
     vão junto — eles não existem sem o chamado. */
  beforeEach(async () => {
    await started.truncate('tickets', 'ticket_attachments');
    started.storage.files.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  // feliz
  it('opens a ticket from the public portal, with no identity and with files', async () => {
    const created = await openTicket()
      .attach('screenshot', PRINT, { filename: 'erro.png', contentType: 'image/png' })
      .attach('attachments', NOTA_FISCAL, { filename: 'nota-fiscal.pdf', contentType: PDF })
      .expect(201);

    expect(created.body).toMatchObject({
      protocol: 'CH-0001',
      status: 'open',
      requesterName: PEDIDO.requesterName,
      department: 'recepcao',
      problemType: 'printer',
      /* Todo chamado nasce sem responsável e sem solução: são do TI. */
      assignee: null,
      solution: null,
    });
    expect(created.body.screenshotUrl).toContain('https://');
  });

  it('lets the IT side answer and attach its own files', async () => {
    const created = await openTicket().expect(201);

    const answered = await request(app.getHttpServer())
      .patch(`/api/tickets/${created.body.id}`)
      .set(asCaio())
      .send({ status: 'in_progress', assignee: 'Caio', solution: 'Troquei o rolete de tração.' })
      .expect(200);

    expect(answered.body).toMatchObject({
      status: 'in_progress',
      assignee: 'Caio',
      updatedBy: 'caio@empresa.com.br',
    });
    /* A data de início é CARIMBADA pelo servidor a partir da mudança de situação. */
    expect(answered.body.startedAt).not.toBeNull();

    const attached = await request(app.getHttpServer())
      .post(`/api/tickets/${created.body.id}/attachments`)
      .set(asCaio())
      .attach('attachments', ORCAMENTO, { filename: 'orcamento-da-peca.pdf', contentType: PDF })
      .expect(201);

    expect(attached.body).toHaveLength(1);
    expect(attached.body[0]).toMatchObject({
      fileName: 'orcamento-da-peca.pdf',
      origin: 'support',
      createdBy: 'caio@empresa.com.br',
    });
  });

  it('shows both sides of the files on the public lookup, and hides what is not for the requester', async () => {
    const created = await openTicket()
      .attach('attachments', NOTA_FISCAL, { filename: 'nota-fiscal.pdf', contentType: PDF })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/tickets/${created.body.id}`)
      .set(asCaio())
      .send({ status: 'resolved', assignee: 'Caio', solution: 'Troquei o rolete.' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/tickets/${created.body.id}/attachments`)
      .set(asCaio())
      .attach('attachments', ORCAMENTO, { filename: 'orcamento-da-peca.pdf', contentType: PDF })
      .expect(201);

    const found = await request(app.getHttpServer())
      .get('/api/tickets/protocol/CH-0001')
      .expect(200);

    /* OS DOIS LADOS aparecem: quem abriu confere que a nota chegou e vê o que o TI juntou. */
    expect(found.body.attachments).toHaveLength(2);
    expect(found.body.attachments.map((file: { origin: string }) => file.origin).sort()).toEqual([
      'requester',
      'support',
    ]);
    expect(found.body.attachments[0].viewUrl).toContain('https://');
    expect(found.body.attachments[0].downloadUrl).toContain('https://');

    /* E O QUE NÃO É DELA FICA DE FORA. A consulta é pública e o protocolo é sequencial: sem
       esta poda, chutar números viraria uma forma de ler o cadastro dos outros. */
    expect(found.body.contactPhone).toBeUndefined();
    expect(found.body.assignee).toBeUndefined();
    expect(found.body.solution).toBeUndefined();
    expect(found.body).toMatchObject({ protocol: 'CH-0001', status: 'resolved' });
  });

  /* Quem anotou o protocolo no celular raramente digita o traço. */
  it('accepts the protocol the way a person actually types it', async () => {
    await openTicket().expect(201);

    for (const typed of ['CH-0001', 'ch 1', '0001', '1']) {
      const found = await request(app.getHttpServer())
        .get(`/api/tickets/protocol/${encodeURIComponent(typed)}`)
        .expect(200);

      expect(found.body.protocol).toBe('CH-0001');
    }
  });

  it('lets the IT side delete its own file, and takes it out of the storage too', async () => {
    const created = await openTicket().expect(201);

    const attached = await request(app.getHttpServer())
      .post(`/api/tickets/${created.body.id}/attachments`)
      .set(asCaio())
      .attach('attachments', ORCAMENTO, { filename: 'orcamento-da-peca.pdf', contentType: PDF })
      .expect(201);

    expect(started.storage.files.size).toBe(1);

    await request(app.getHttpServer())
      .delete(`/api/tickets/${created.body.id}/attachments/${attached.body[0].id}`)
      .set(asCaio())
      .expect(204);

    /* A regra é "sai do banco E do armazenamento". Sem a segunda metade sobraria um arquivo
       pago que ninguém alcança. */
    expect(started.storage.files.size).toBe(0);

    const left = await request(app.getHttpServer())
      .get(`/api/tickets/${created.body.id}/attachments`)
      .set(asCaio())
      .expect(200);

    expect(left.body).toHaveLength(0);
  });

  // triste
  /**
   * A REGRA DE DONO DO ANEXO, que é a razão de o módulo ter dois `origin`.
   *
   * Apagar o print de alguém e depois dizer "não recebi print nenhum" é uma história que o
   * sistema não pode deixar acontecer, nem por engano de clique.
   */
  it('refuses the IT side deleting a file sent by whoever opened the ticket', async () => {
    const created = await openTicket()
      .attach('attachments', NOTA_FISCAL, { filename: 'nota-fiscal.pdf', contentType: PDF })
      .expect(201);

    const files = await request(app.getHttpServer())
      .get(`/api/tickets/${created.body.id}/attachments`)
      .set(asCaio())
      .expect(200);

    const fromRequester = files.body.find(
      (file: { origin: string }) => file.origin === 'requester',
    );

    const refused = await request(app.getHttpServer())
      .delete(`/api/tickets/${created.body.id}/attachments/${fromRequester.id}`)
      .set(asCaio())
      .expect(403);

    expect(refused.body.message).toContain('só quem enviou é dono do que enviou');
    /* E o arquivo continua onde estava: recusar e apagar mesmo assim seria pior que não ter
       regra nenhuma. */
    expect(started.storage.files.size).toBe(1);
  });

  /**
   * O outro sentido da mesma regra: pelo lado de quem abriu o chamado não existe porta para
   * mexer em arquivo nenhum — nem no dela.
   *
   * A consulta é pública e o protocolo é sequencial. Se excluir fosse público, quem chutasse
   * um número apagaria arquivo de chamado alheio.
   */
  it('gives the requester no door to touch files, not even their own', async () => {
    const created = await openTicket()
      .attach('attachments', NOTA_FISCAL, { filename: 'nota-fiscal.pdf', contentType: PDF })
      .expect(201);

    const files = await request(app.getHttpServer())
      .get(`/api/tickets/${created.body.id}/attachments`)
      .set(asCaio())
      .expect(200);

    /* Sem identidade: 401 em excluir, em listar e em anexar. */
    await request(app.getHttpServer())
      .delete(`/api/tickets/${created.body.id}/attachments/${files.body[0].id}`)
      .expect(401);
    await request(app.getHttpServer())
      .get(`/api/tickets/${created.body.id}/attachments`)
      .expect(401);
    await request(app.getHttpServer())
      .post(`/api/tickets/${created.body.id}/attachments`)
      .attach('attachments', ORCAMENTO, { filename: 'qualquer.pdf', contentType: PDF })
      .expect(401);

    /* E o arquivo dela continua lá, visível na consulta pública. */
    const found = await request(app.getHttpServer())
      .get('/api/tickets/protocol/CH-0001')
      .expect(200);

    expect(found.body.attachments).toHaveLength(1);
  });

  it('refuses a file that is not in the catalogue, and keeps the ticket', async () => {
    await openTicket()
      .attach('attachments', Buffer.from('MZ executavel'), {
        filename: 'instalador.exe',
        contentType: 'application/x-msdownload',
      })
      .expect(400);

    /* O CHAMADO FICA. Perder o pedido de socorro por causa de um arquivo recusado seria o pior
       dos dois males: quem enviou vê o protocolo e anexa o resto pelo painel. */
    const found = await request(app.getHttpServer())
      .get('/api/tickets/protocol/CH-0001')
      .expect(200);

    expect(found.body.attachments).toHaveLength(0);
  });

  it('refuses an empty description with 4xx and names the field, in Portuguese', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/tickets')
      .field('requesterName', PEDIDO.requesterName)
      .field('department', PEDIDO.department)
      .field('problemType', PEDIDO.problemType)
      .field('contactPhone', PEDIDO.contactPhone)
      .field('description', '   ');

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(response.body.details).toContainEqual({
      field: 'description',
      message: 'Descreva o problema',
    });
  });

  it('refuses a phone without enough digits, naming the field', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/tickets')
      .field('requesterName', PEDIDO.requesterName)
      .field('department', PEDIDO.department)
      .field('problemType', PEDIDO.problemType)
      .field('contactPhone', '9999')
      .field('description', PEDIDO.description);

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body.details).toContainEqual({
      field: 'contactPhone',
      message: 'Informe o WhatsApp com DDD',
    });
  });

  /* O portal público não decide situação nem responsável: aceitar isso deixaria qualquer um
     abrir um chamado já resolvido por outra pessoa. */
  it('ignores status, assignee and solution sent to the public door', async () => {
    const created = await openTicket()
      .field('status', 'resolved')
      .field('assignee', 'Alguem que nao existe')
      .field('solution', 'Resolvido por mim mesmo')
      .expect(201);

    expect(created.body).toMatchObject({ status: 'open', assignee: null, solution: null });
  });

  it('answers 404 for a protocol that does not exist, and for one that is not a number', async () => {
    await request(app.getHttpServer()).get('/api/tickets/protocol/CH-9999').expect(404);
    await request(app.getHttpServer()).get('/api/tickets/protocol/nao-e-protocolo').expect(404);
  });

  /* A porta do PAINEL é fechada: a pública é só abrir e consultar por protocolo. */
  it('keeps the panel closed without a token', async () => {
    await request(app.getHttpServer()).get('/api/tickets').expect(401);
    await request(app.getHttpServer()).get('/api/tickets/1').expect(401);
    await request(app.getHttpServer()).get('/api/tickets/dashboard').expect(401);
    await request(app.getHttpServer())
      .patch('/api/tickets/1')
      .send({ status: 'resolved' })
      .expect(401);
  });

  /* Atender é do time inteiro, e não só de gerente: chamado parado esperando o gerente certo é
     pior para quem está sem impressora. Mas continua exigindo estar identificado. */
  it('lets any identified person answer, and nobody unidentified', async () => {
    const created = await openTicket().expect(201);

    await request(app.getHttpServer())
      .patch(`/api/tickets/${created.body.id}`)
      .set(asBia())
      .send({ status: 'in_progress' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/tickets/${created.body.id}`)
      .set({ Authorization: 'Bearer token-inventado' })
      .send({ status: 'resolved' })
      .expect(401);
  });
});
