import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { asCaio, createE2eApp, type E2eApp } from './support/e2e-app.util';

/**
 * O INVENTÁRIO de ponta a ponta: cadastrar e receber o token do agente, achar a máquina na
 * lista, e tirá-la de circulação — bloqueada, arquivada ou descartada.
 *
 * O que só quebra aqui: o filtro virando consulta, e a PAGINAÇÃO sendo de verdade. Uma lista
 * que traz tudo e corta na tela passa em todo teste de componente e derruba o banco quando o
 * parque cresce — a única prova é pedir a página 2 a um banco de verdade e conferir que ela
 * trouxe o resto, sem repetir ninguém.
 *
 * Sem `TEST_DATABASE_URL` a suíte é pulada, e não falha.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!testDatabaseUrl)('Computers API (e2e)', () => {
  let started: E2eApp;
  let app: INestApplication;

  const register = (name: string, extra: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post('/api/computers')
      .set(asCaio())
      .send({ name, ...extra });

  beforeAll(async () => {
    started = await createE2eApp(testDatabaseUrl!);
    app = started.app;
  });

  /* O parque começa vazio em cada teste: nenhum deles conta com máquina deixada por outro. */
  beforeEach(async () => {
    await started.truncate('computers');
  });

  afterAll(async () => {
    await app.close();
  });

  // feliz
  it('registers a machine and hands over the agent token, once', async () => {
    const created = await register('PC-RECEPCAO-01', {
      displayName: 'Recepção',
      responsibleName: 'Marta',
      department: 'recepcao',
    }).expect(201);

    expect(created.body.token).toBeTruthy();
    expect(created.body.computer).toMatchObject({
      name: 'PC-RECEPCAO-01',
      displayName: 'Recepção',
      department: 'recepcao',
      isArchived: false,
      isBlocked: false,
      isOnline: false,
      disposedAt: null,
    });

    /* O TOKEN NÃO VOLTA NUNCA MAIS. O banco guarda só o hash, como senha: poder recuperá-lo
       exigiria guardá-lo legível, que é exatamente o que não se quer. */
    const found = await request(app.getHttpServer())
      .get(`/api/computers/${created.body.computer.id}`)
      .set(asCaio())
      .expect(200);

    expect(found.body.token).toBeUndefined();
    expect(JSON.stringify(found.body)).not.toContain(created.body.token);
  });

  it('gives a new token and throws the old one away', async () => {
    const created = await register('PC-FISCAL-01').expect(201);

    const again = await request(app.getHttpServer())
      .post(`/api/computers/${created.body.computer.id}/token`)
      .set(asCaio())
      .expect(201);

    expect(again.body.token).toBeTruthy();
    expect(again.body.token).not.toBe(created.body.token);
    expect(again.body.computer.updatedBy).toBe('caio@empresa.com.br');
  });

  /**
   * A PAGINAÇÃO DE VERDADE — a consulta paginada, não o corte na tela.
   *
   * `total` precisa ser o do parque inteiro e `items` só o da página. Quando os dois são
   * iguais, é sinal de que a consulta trouxe tudo e alguém fatiou depois.
   */
  it('pages the query itself, and never repeats a machine between pages', async () => {
    for (let number = 1; number <= 7; number += 1) {
      await register(`PC-CONTABIL-${String(number).padStart(2, '0')}`).expect(201);
    }

    const first = await request(app.getHttpServer())
      .get('/api/computers?page=1&pageSize=3')
      .set(asCaio())
      .expect(200);
    const second = await request(app.getHttpServer())
      .get('/api/computers?page=2&pageSize=3')
      .set(asCaio())
      .expect(200);
    const third = await request(app.getHttpServer())
      .get('/api/computers?page=3&pageSize=3')
      .set(asCaio())
      .expect(200);

    expect(first.body).toMatchObject({ total: 7, page: 1, pageSize: 3 });
    expect(first.body.items).toHaveLength(3);
    expect(second.body.items).toHaveLength(3);
    expect(third.body.items).toHaveLength(1);

    const names = [...first.body.items, ...second.body.items, ...third.body.items].map(
      (machine: { name: string }) => machine.name,
    );
    expect(new Set(names).size).toBe(7);
  });

  it('filters by department and by search, on the query and not on the screen', async () => {
    await register('PC-RECEPCAO-01', { department: 'recepcao', responsibleName: 'Marta' }).expect(201);
    await register('PC-FISCAL-01', { department: 'fiscal', responsibleName: 'Joana' }).expect(201);
    await register('PC-FISCAL-02', { department: 'fiscal', responsibleName: 'Pedro' }).expect(201);

    const fiscal = await request(app.getHttpServer())
      .get('/api/computers?department=fiscal')
      .set(asCaio())
      .expect(200);

    expect(fiscal.body.total).toBe(2);
    expect(fiscal.body.items).toHaveLength(2);

    /* A busca também procura no responsável — é como se acha "a máquina da Marta". */
    const byPerson = await request(app.getHttpServer())
      .get('/api/computers?search=marta')
      .set(asCaio())
      .expect(200);

    expect(byPerson.body.total).toBe(1);
    expect(byPerson.body.items[0].name).toBe('PC-RECEPCAO-01');
  });

  it('blocks a machine, keeping the reason', async () => {
    const created = await register('PC-RH-01').expect(201);

    const blocked = await request(app.getHttpServer())
      .patch(`/api/computers/${created.body.computer.id}`)
      .set(asCaio())
      .send({ isBlocked: true, blockReason: 'Máquina emprestada para auditoria externa.' })
      .expect(200);

    expect(blocked.body).toMatchObject({
      isBlocked: true,
      blockReason: 'Máquina emprestada para auditoria externa.',
    });

    /* Bloqueada NÃO sai da lista: ela continua no parque, só com a conexão do agente recusada.
       Esconder seria perder de vista justamente a máquina que alguém precisa destravar. */
    const list = await request(app.getHttpServer())
      .get('/api/computers')
      .set(asCaio())
      .expect(200);

    expect(list.body.total).toBe(1);
  });

  it('archives a machine out of the day-to-day list, and brings it back when asked', async () => {
    const created = await register('PC-ANTIGO-01').expect(201);

    await request(app.getHttpServer())
      .patch(`/api/computers/${created.body.computer.id}`)
      .set(asCaio())
      .send({ isArchived: true })
      .expect(200);

    const normal = await request(app.getHttpServer())
      .get('/api/computers')
      .set(asCaio())
      .expect(200);
    const withArchived = await request(app.getHttpServer())
      .get('/api/computers?includeArchived=true')
      .set(asCaio())
      .expect(200);

    expect(normal.body.total).toBe(0);
    expect(withArchived.body.total).toBe(1);

    /* Nada foi apagado: a ficha continua alcançável pelo id, com o histórico dela. */
    await request(app.getHttpServer())
      .get(`/api/computers/${created.body.computer.id}`)
      .set(asCaio())
      .expect(200);
  });

  it('discards a machine with type and reason, and puts it back on request', async () => {
    const created = await register('PC-QUEIMADO-01').expect(201);
    const id = created.body.computer.id;

    const discarded = await request(app.getHttpServer())
      .post(`/api/computers/${id}/disposal`)
      .set(asCaio())
      .send({ type: 'defect', reason: 'Placa-mãe queimada; orçamento passou do valor da máquina.' })
      .expect(201);

    expect(discarded.body).toMatchObject({
      disposalType: 'defect',
      disposalReason: 'Placa-mãe queimada; orçamento passou do valor da máquina.',
    });
    /* A data é carimbada pelo servidor: deixar digitar seria um jeito silencioso de lançar
       uma saída "de ontem" e ajustar o passado. */
    expect(discarded.body.disposedAt).not.toBeNull();

    const parque = await request(app.getHttpServer())
      .get('/api/computers')
      .set(asCaio())
      .expect(200);
    const descarte = await request(app.getHttpServer())
      .get('/api/computers?onlyDisposed=true')
      .set(asCaio())
      .expect(200);

    expect(parque.body.total).toBe(0);
    expect(descarte.body.total).toBe(1);

    const restored = await request(app.getHttpServer())
      .delete(`/api/computers/${id}/disposal`)
      .set(asCaio())
      .expect(200);

    expect(restored.body).toMatchObject({
      disposedAt: null,
      disposalType: null,
      disposalReason: null,
    });
  });

  /* Descartar de novo troca o TIPO e preserva a data original: foi quando ela saiu de uso. */
  it('keeps the original date when the discard type is corrected', async () => {
    const created = await register('PC-SUCATA-01').expect(201);
    const id = created.body.computer.id;

    const first = await request(app.getHttpServer())
      .post(`/api/computers/${id}/disposal`)
      .set(asCaio())
      .send({ type: 'defect', reason: 'Não liga.' })
      .expect(201);

    const second = await request(app.getHttpServer())
      .post(`/api/computers/${id}/disposal`)
      .set(asCaio())
      .send({ type: 'scrap', reason: 'Sem conserto possível; virou sucata.' })
      .expect(201);

    expect(second.body.disposalType).toBe('scrap');
    expect(second.body.disposedAt).toBe(first.body.disposedAt);
  });

  // triste
  it('keeps the whole inventory closed without a token', async () => {
    await request(app.getHttpServer()).get('/api/computers').expect(401);
    await request(app.getHttpServer()).post('/api/computers').send({ name: 'PC-X' }).expect(401);
    await request(app.getHttpServer()).get('/api/computers/1').expect(401);
    await request(app.getHttpServer()).post('/api/computers/1/token').expect(401);
    await request(app.getHttpServer())
      .post('/api/computers/1/disposal')
      .send({ type: 'defect', reason: 'qualquer' })
      .expect(401);
  });

  it('refuses a machine with no name, naming the field in Portuguese', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/computers')
      .set(asCaio())
      .send({ name: '   ' });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(response.body.details).toContainEqual({
      field: 'name',
      message: 'Informe o nome da máquina',
    });
  });

  /**
   * DUAS MÁQUINAS COM O MESMO NOME é recusado pelo BANCO, e a mensagem diz o que fazer.
   *
   * O nome vem da própria máquina e é a chave pela qual o agente se encontra: duas linhas com
   * o mesmo nome fariam a telemetria de uma cair na ficha da outra.
   */
  it('refuses a duplicated machine name with 409, saying what to do instead', async () => {
    await register('PC-REPETIDO-01').expect(201);

    const again = await register('PC-REPETIDO-01').expect(409);

    expect(again.body.message).toContain('Abra o cadastro existente');
  });

  it('refuses a discard without a reason, naming the field', async () => {
    const created = await register('PC-SEM-MOTIVO-01').expect(201);

    const response = await request(app.getHttpServer())
      .post(`/api/computers/${created.body.computer.id}/disposal`)
      .set(asCaio())
      .send({ type: 'defect', reason: '  ' });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body.details).toContainEqual({
      field: 'reason',
      message: 'Diga por que a máquina saiu de uso',
    });
  });

  it('refuses a discard type that is not on the list', async () => {
    const created = await register('PC-TIPO-ERRADO-01').expect(201);

    const response = await request(app.getHttpServer())
      .post(`/api/computers/${created.body.computer.id}/disposal`)
      .set(asCaio())
      .send({ type: 'jogado-fora', reason: 'Qualquer motivo.' });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body.details).toContainEqual({
      field: 'type',
      message: 'Diga se a máquina tem defeito ou virou lixo',
    });
  });

  /* Hardware NÃO se digita: é medido pelo agente. Corrigir à mão faria a ficha discordar da
     máquina na próxima leitura, e a discordância é invisível. */
  it('ignores hardware sent by hand to the identification route', async () => {
    const created = await register('PC-HARDWARE-01').expect(201);

    const updated = await request(app.getHttpServer())
      .patch(`/api/computers/${created.body.computer.id}`)
      .set(asCaio())
      .send({ displayName: 'Balcão', cpuModel: 'CPU inventada', healthScore: 3 })
      .expect(200);

    expect(updated.body.displayName).toBe('Balcão');
    expect(updated.body.cpuModel).not.toBe('CPU inventada');
    expect(updated.body.healthScore).not.toBe(3);
  });

  it('answers 404 for a machine that does not exist', async () => {
    await request(app.getHttpServer()).get('/api/computers/999999').set(asCaio()).expect(404);
    await request(app.getHttpServer())
      .post('/api/computers/999999/token')
      .set(asCaio())
      .expect(404);
    await request(app.getHttpServer())
      .patch('/api/computers/999999')
      .set(asCaio())
      .send({ displayName: 'Nada' })
      .expect(404);
  });

  it('refuses a page size above the ceiling, so no query comes back unbounded', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/computers?pageSize=5000')
      .set(asCaio());

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });
});
