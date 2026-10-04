import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { internalRoles } from '../src/lib/db/schema/internal-roles.schema';
import { BIA, CAIO, asBia, asCaio, createE2eApp, type E2eApp } from './support/e2e-app.util';

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
  area: 'infra',
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
      .field('area', PEDIDO.area)
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
     vão junto — eles não existem sem o chamado.
     `internal_roles` entra junto (#13): sem cargo nenhum, Caio e Bia não enxergariam chamado
     nenhum — o padrão agora é SEM ACESSO, não o cargo mínimo `user`. Os dois ganham `admin`
     em Infra, a área de todo chamado deste arquivo: o FOCO aqui é o fluxo de ponta a ponta
     (anexo, consulta pública, identidade), não a régua fina de cargo — essa já tem suíte
     própria em `tickets.service.test.ts`. */
  beforeEach(async () => {
    await started.truncate('tickets', 'ticket_attachments', 'ticket_histories', 'internal_roles');
    started.storage.files.clear();

    await started.db.insert(internalRoles).values([
      { userId: CAIO.id, userEmail: CAIO.email, context: 'infra', role: 'admin' },
      { userId: BIA.id, userEmail: BIA.email, context: 'infra', role: 'admin' },
    ]);
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

  /**
   * A ORDEM DE SERVIÇO de ponta a ponta: abrir, assumir, esperar a peça, retomar e encerrar —
   * cada passo um histórico, e o estágio do chamado sempre a leitura do último.
   */
  it('walks a ticket through its whole timeline, one history at a time', async () => {
    const created = await openTicket().expect(201);
    const launch = (type: string, description: string) =>
      request(app.getHttpServer())
        .post(`/api/tickets/${created.body.id}/histories`)
        .set(asCaio())
        .send({ type, description });

    const started = await launch('start', 'Assumi o chamado.').expect(201);
    expect(started.body).toMatchObject({
      type: 'start',
      statusAfter: 'in_progress',
      createdBy: 'caio@empresa.com.br',
    });

    await launch('waiting_third_party', 'Pedi o rolete ao fornecedor.').expect(201);
    await launch('resume', 'O rolete chegou.').expect(201);
    await launch('closure_with_caveats', 'Troquei o rolete; a bandeja 2 segue com defeito.').expect(201);

    const ticket = await request(app.getHttpServer())
      .get(`/api/tickets/${created.body.id}`)
      .set(asCaio())
      .expect(200);

    expect(ticket.body).toMatchObject({
      status: 'resolved_with_caveats',
      solution: 'Troquei o rolete; a bandeja 2 segue com defeito.',
      updatedBy: 'caio@empresa.com.br',
    });
    /* Os carimbos são do SERVIDOR, a partir dos históricos. */
    expect(ticket.body.startedAt).not.toBeNull();
    expect(ticket.body.resolvedAt).not.toBeNull();

    const timeline = await request(app.getHttpServer())
      .get(`/api/tickets/${created.body.id}/histories`)
      .set(asCaio())
      .expect(200);

    /* A abertura é do sistema, assinada por quem abriu; o resto, por quem atendeu. */
    expect(timeline.body.map((history: { type: string }) => history.type)).toEqual([
      'opening',
      'start',
      'waiting_third_party',
      'resume',
      'closure_with_caveats',
    ]);
    expect(timeline.body[0]).toMatchObject({ authorName: PEDIDO.requesterName, createdBy: null });
  });

  it('attaches the files sent with a history to that history', async () => {
    const created = await openTicket().expect(201);

    const history = await request(app.getHttpServer())
      .post(`/api/tickets/${created.body.id}/histories`)
      .set(asCaio())
      .field('type', 'note')
      .field('description', 'Segue o orçamento da peça.')
      .field('minutesSpent', '20')
      .attach('attachments', ORCAMENTO, { filename: 'orcamento-da-peca.pdf', contentType: PDF })
      .expect(201);

    expect(history.body.minutesSpent).toBe(20);
    expect(history.body.attachments).toHaveLength(1);
    expect(history.body.attachments[0]).toMatchObject({
      fileName: 'orcamento-da-peca.pdf',
      origin: 'support',
      historyId: history.body.id,
    });
  });

  it('builds the service order of a ticket as a PDF', async () => {
    const created = await openTicket().expect(201);

    const report = await request(app.getHttpServer())
      .get(`/api/tickets/${created.body.id}/service-order`)
      .set(asCaio())
      .expect(200);

    expect(report.headers['content-type']).toContain('application/pdf');
    expect(report.headers['content-disposition']).toContain('ordem-de-servico-CH-0001.pdf');
  });

  it('lets the IT side correct the ticket data and attach its own files', async () => {
    const created = await openTicket().expect(201);

    const answered = await request(app.getHttpServer())
      .patch(`/api/tickets/${created.body.id}`)
      .set(asCaio())
      .send({ priority: 'high', assignee: 'Caio' })
      .expect(200);

    expect(answered.body).toMatchObject({
      priority: 'high',
      assignee: 'Caio',
      updatedBy: 'caio@empresa.com.br',
    });

    /* A correção fica na linha do tempo, sozinha — e escondida de quem abriu. */
    const timeline = await request(app.getHttpServer())
      .get(`/api/tickets/${created.body.id}/histories`)
      .set(asCaio())
      .expect(200);

    expect(timeline.body.at(-1)).toMatchObject({ type: 'update', isVisibleToRequester: false });

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
      .post(`/api/tickets/${created.body.id}/histories`)
      .set(asCaio())
      .send({ type: 'note', description: 'Peça cotada com dois fornecedores.', isVisibleToRequester: false })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/tickets/${created.body.id}/histories`)
      .set(asCaio())
      .send({ type: 'resolution', description: 'Troquei o rolete.' })
      .expect(201);

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

    /* A LINHA DO TEMPO pública: só o que foi marcado como visível, e sem o bastidor. O
       andamento interno (a cotação) não aparece; a abertura e a solução, sim. */
    expect(found.body.histories.map((history: { type: string }) => history.type)).toEqual([
      'opening',
      'resolution',
    ]);
    expect(found.body.histories[1].createdBy).toBeUndefined();
    expect(found.body.histories[1].minutesSpent).toBeUndefined();
  });

  /* Encerrado é encerrado: para escrever de novo, reabra — e a reabertura fica registrada. */
  it('refuses a history on a closed ticket until it is reopened', async () => {
    const created = await openTicket().expect(201);
    const launch = (type: string) =>
      request(app.getHttpServer())
        .post(`/api/tickets/${created.body.id}/histories`)
        .set(asCaio())
        .send({ type, description: 'Registro de teste.' });

    await launch('cancellation').expect(201);

    const refused = await launch('note').expect(422);
    expect(refused.body.message).toContain('Reabra-o');

    await launch('reopening').expect(201);
    await launch('note').expect(201);
  });

  /* O estágio NÃO muda por fora: mandar `status` na correção de dados é ignorado. */
  it('ignores a stage sent through the data door', async () => {
    const created = await openTicket().expect(201);

    const patched = await request(app.getHttpServer())
      .patch(`/api/tickets/${created.body.id}`)
      .set(asCaio())
      .send({ status: 'resolved', solution: 'Fechei por fora.' })
      .expect(200);

    expect(patched.body).toMatchObject({ status: 'open', solution: null });
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

  /* A FILA do painel também precisa achar pelo protocolo — sem isto, procurar "CH-0001" na
     busca da tela não achava nada: `protocol` não é coluna, é o `id` vestido (#13). */
  it('finds a ticket on the panel queue by protocol, typed loosely', async () => {
    await openTicket().expect(201);

    for (const typed of ['CH-0001', 'ch 1', '1']) {
      const found = await request(app.getHttpServer())
        .get('/api/tickets')
        .query({ search: typed })
        .set(asCaio())
        .expect(200);

      expect(found.body.items).toHaveLength(1);
      expect(found.body.items[0].protocol).toBe('CH-0001');
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
      .field('area', PEDIDO.area)
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
      .field('area', PEDIDO.area)
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
      .send({ priority: 'high' })
      .expect(401);
    await request(app.getHttpServer()).get('/api/tickets/1/histories').expect(401);
    await request(app.getHttpServer()).get('/api/tickets/1/service-order').expect(401);
    await request(app.getHttpServer())
      .post('/api/tickets/1/histories')
      .send({ type: 'resolution', description: 'Fechei sem me identificar.' })
      .expect(401);
  });

  /* Atender exige cargo na área do chamado (#13, Bia tem `admin` em Infra no `beforeEach`) —
     e continua exigindo estar identificado, sempre. */
  it('lets whoever has a cargo in the area answer, and nobody unidentified', async () => {
    const created = await openTicket().expect(201);

    await request(app.getHttpServer())
      .post(`/api/tickets/${created.body.id}/histories`)
      .set(asBia())
      .send({ type: 'start', description: 'Assumi o chamado.' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/tickets/${created.body.id}/histories`)
      .set({ Authorization: 'Bearer token-inventado' })
      .send({ type: 'resolution', description: 'Fechei sem me identificar.' })
      .expect(401);
  });
});
