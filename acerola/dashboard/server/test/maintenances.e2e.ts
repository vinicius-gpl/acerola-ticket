import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { asAna, asBia, asCaio, createE2eApp, type E2eApp } from './support/e2e-app.util';

/**
 * A MANUTENÇÃO de ponta a ponta: registrar o serviço, a máquina passar a contar no histórico
 * dela, e o quadro de preventivas enxergar o que venceu.
 *
 * O que só quebra aqui: a autoria vindo da identidade (e não do corpo), e o cruzamento do
 * inventário com o histórico — que não é tabela nenhuma, é consulta refeita a cada leitura.
 * Service com repository fingido devolve o que o teste mandou devolver; aqui é o Postgres que
 * agrupa, conta e escolhe a data mais recente.
 *
 * Sem `TEST_DATABASE_URL` a suíte é pulada, e não falha.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

const HOJE = new Date();

/** Seis meses atrás: passou do intervalo de três meses, então a preventiva está vencida. */
const SEIS_MESES_ATRAS = new Date(HOJE.getFullYear(), HOJE.getMonth() - 6, 15);

describe.skipIf(!testDatabaseUrl)('Maintenances API (e2e)', () => {
  let started: E2eApp;
  let app: INestApplication;

  const registerComputer = async (name: string): Promise<number> => {
    const created = await request(app.getHttpServer())
      .post('/api/computers')
      .set(asCaio())
      .send({ name })
      .expect(201);

    return created.body.computer.id;
  };

  const registerMaintenance = (body: Record<string, unknown>, who = asAna()) =>
    request(app.getHttpServer()).post('/api/maintenances').set(who).send(body);

  beforeAll(async () => {
    started = await createE2eApp(testDatabaseUrl!);
    app = started.app;
  });

  /* As duas tabelas: a manutenção aponta para a máquina, e um teste que herdasse a máquina do
     anterior veria o histórico dele. */
  beforeEach(async () => {
    await started.truncate('maintenances', 'computers');
  });

  afterAll(async () => {
    await app.close();
  });

  // feliz
  /**
   * A AUTORIA VEM DA IDENTIDADE, NUNCA DO CORPO.
   *
   * É uma linha trocada que passa na revisão sem ninguém ver, e o efeito é um histórico que
   * diz que outra pessoa fez o serviço — exatamente o registro em que alguém se apoiaria para
   * responder "quem mexeu nessa máquina?".
   */
  it('stamps the author from the identity and ignores the one sent in the body', async () => {
    const computerId = await registerComputer('PC-CONTABIL-01');

    const created = await registerMaintenance({
      computerId,
      type: 'preventive',
      description: 'Limpeza interna e troca da pasta térmica.',
      performedBy: 'Técnico da loja',
      performedAt: HOJE.toISOString(),
      createdBy: 'caio@empresa.com.br',
      updatedBy: 'caio@empresa.com.br',
    }).expect(201);

    expect(created.body).toMatchObject({
      computerId,
      computerName: 'PC-CONTABIL-01',
      type: 'preventive',
      /* Quem FEZ o serviço é texto livre (pode ser alguém de fora); quem REGISTROU vem do
         token, e são coisas diferentes de propósito. */
      performedBy: 'Técnico da loja',
      createdBy: 'ana@empresa.com.br',
    });
  });

  it('makes the machine start counting in its own history', async () => {
    const computerId = await registerComputer('PC-FISCAL-01');
    const outroId = await registerComputer('PC-RH-01');

    await registerMaintenance({
      computerId,
      type: 'cleaning',
      performedAt: HOJE.toISOString(),
    }).expect(201);
    await registerMaintenance({
      computerId,
      type: 'corrective',
      performedAt: HOJE.toISOString(),
    }).expect(201);
    await registerMaintenance({
      computerId: outroId,
      type: 'cleaning',
      performedAt: HOJE.toISOString(),
    }).expect(201);

    const daMaquina = await request(app.getHttpServer())
      .get(`/api/maintenances?computerId=${computerId}`)
      .set(asAna())
      .expect(200);

    expect(daMaquina.body.total).toBe(2);
    expect(daMaquina.body.items).toHaveLength(2);

    const todas = await request(app.getHttpServer())
      .get('/api/maintenances')
      .set(asAna())
      .expect(200);

    expect(todas.body.total).toBe(3);
  });

  /* O nome da máquina vem do INVENTÁRIO a cada consulta, e não de uma cópia guardada na
     manutenção: renomeada, o histórico inteiro passa a falar do nome novo. Com cópia, o
     passado falaria de um equipamento que ninguém mais reconhece. */
  it('shows the current machine name across the whole history after a rename', async () => {
    const computerId = await registerComputer('PC-SEM-APELIDO-01');

    await registerMaintenance({
      computerId,
      type: 'cleaning',
      performedAt: HOJE.toISOString(),
    }).expect(201);

    await request(app.getHttpServer())
      .patch(`/api/computers/${computerId}`)
      .set(asCaio())
      .send({ displayName: 'Balcão do Fiscal' })
      .expect(200);

    const historico = await request(app.getHttpServer())
      .get(`/api/maintenances?computerId=${computerId}`)
      .set(asAna())
      .expect(200);

    expect(historico.body.items[0].computerDisplayName).toBe('Balcão do Fiscal');
  });

  /**
   * O QUADRO DE PREVENTIVAS: o cruzamento do inventário com o histórico.
   *
   * Não é tabela: a situação é calculada a cada consulta. Como campo salvo, uma máquina ficaria
   * presa em "em dia" para sempre, porque ninguém fica vivo para reescrever o campo no dia em
   * que o prazo vira.
   */
  it('puts every machine on the preventive board, with what each one is owing', async () => {
    const nunca = await registerComputer('PC-NUNCA-01');
    const emDia = await registerComputer('PC-EM-DIA-01');
    const vencida = await registerComputer('PC-VENCIDA-01');

    await registerMaintenance({
      computerId: emDia,
      type: 'preventive',
      performedAt: HOJE.toISOString(),
    }).expect(201);
    await registerMaintenance({
      computerId: vencida,
      type: 'preventive',
      performedAt: SEIS_MESES_ATRAS.toISOString(),
    }).expect(201);

    const board = await request(app.getHttpServer())
      .get('/api/maintenances/preventive')
      .set(asAna())
      .expect(200);

    const of = (computerId: number) =>
      board.body.find((line: { computerId: number }) => line.computerId === computerId);

    /* Máquina sem manutenção nenhuma ENTRA no quadro: é justamente a que ninguém abriu. */
    expect(of(nunca)).toMatchObject({ status: 'never', lastDoneAt: null, maintenanceCount: 0 });
    expect(of(emDia)).toMatchObject({ status: 'ok', maintenanceCount: 1 });
    expect(of(vencida)).toMatchObject({ status: 'due', maintenanceCount: 1 });
  });

  /* Limpeza não zera o prazo da preventiva: só `preventive` e `corrective` contam como "a
     máquina foi aberta". Contar tudo faria uma máquina passar anos sem revisão de verdade e
     ainda assim aparecer em dia. */
  it('does not let a cleaning pass for a preventive on the board', async () => {
    const computerId = await registerComputer('PC-SO-LIMPEZA-01');

    await registerMaintenance({
      computerId,
      type: 'cleaning',
      performedAt: HOJE.toISOString(),
    }).expect(201);

    const board = await request(app.getHttpServer())
      .get('/api/maintenances/preventive')
      .set(asAna())
      .expect(200);

    const line = board.body.find(
      (row: { computerId: number }) => row.computerId === computerId,
    );

    expect(line).toMatchObject({ status: 'never', lastDoneAt: null, maintenanceCount: 1 });
  });

  /* Máquina arquivada sai do quadro: cobrar preventiva de equipamento que saiu de uso é
     trabalho que ninguém vai fazer. */
  it('leaves an archived machine out of the preventive board', async () => {
    const computerId = await registerComputer('PC-ARQUIVADO-01');

    await request(app.getHttpServer())
      .patch(`/api/computers/${computerId}`)
      .set(asCaio())
      .send({ isArchived: true })
      .expect(200);

    const board = await request(app.getHttpServer())
      .get('/api/maintenances/preventive')
      .set(asAna())
      .expect(200);

    expect(
      board.body.find((row: { computerId: number }) => row.computerId === computerId),
    ).toBeUndefined();
  });

  /* Equipamento de fora do inventário — uma impressora, um notebook antigo — entra pelo nome. */
  it('accepts equipment that is not in the inventory, by name', async () => {
    const created = await registerMaintenance({
      otherMachine: 'Impressora da recepção (Brother HL-1212W)',
      type: 'corrective',
      description: 'Troca do rolete de tração.',
      performedAt: HOJE.toISOString(),
    }).expect(201);

    expect(created.body).toMatchObject({
      computerId: null,
      computerName: null,
      otherMachine: 'Impressora da recepção (Brother HL-1212W)',
    });
  });

  it('lets a manager fix a record created by someone else, stamping who changed it', async () => {
    const computerId = await registerComputer('PC-DA-ANA-01');
    const created = await registerMaintenance({
      computerId,
      type: 'cleaning',
      performedAt: HOJE.toISOString(),
    }).expect(201);

    const updated = await request(app.getHttpServer())
      .patch(`/api/maintenances/${created.body.id}`)
      .set(asCaio())
      .send({ description: 'Limpeza e troca da pasta térmica.' })
      .expect(200);

    expect(updated.body).toMatchObject({
      description: 'Limpeza e troca da pasta térmica.',
      /* Quem CRIOU não muda; quem ALTEROU é carimbado de novo, também pela identidade. */
      createdBy: 'ana@empresa.com.br',
      updatedBy: 'caio@empresa.com.br',
    });
  });

  // triste
  it('keeps the maintenance history closed without a token', async () => {
    await request(app.getHttpServer()).get('/api/maintenances').expect(401);
    await request(app.getHttpServer()).get('/api/maintenances/preventive').expect(401);
    await request(app.getHttpServer())
      .post('/api/maintenances')
      .send({ otherMachine: 'Qualquer', type: 'cleaning', performedAt: HOJE.toISOString() })
      .expect(401);
  });

  /**
   * Uma manutenção precisa dizer EM QUE equipamento foi feita.
   *
   * Sem isso o registro não serve para nada: um histórico que não diz de quem é não responde
   * "esta máquina dá trabalho demais?", que é a pergunta que ele existe para responder.
   */
  it('refuses a maintenance that does not say which equipment, naming the field', async () => {
    const response = await registerMaintenance({
      type: 'cleaning',
      performedAt: HOJE.toISOString(),
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(response.body.details).toContainEqual({
      field: 'computerId',
      message: 'Escolha a máquina ou informe o nome do equipamento',
    });
  });

  it('refuses a type that is not on the list, in Portuguese', async () => {
    const response = await registerMaintenance({
      otherMachine: 'Impressora',
      type: 'consertei-na-marra',
      performedAt: HOJE.toISOString(),
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body.details).toContainEqual({
      field: 'type',
      message: 'Escolha um tipo de manutenção da lista',
    });
  });

  it('refuses a date that is not a date', async () => {
    const response = await registerMaintenance({
      otherMachine: 'Impressora',
      type: 'cleaning',
      performedAt: '15/03/2026',
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body.details).toContainEqual({
      field: 'performedAt',
      message: 'Informe uma data válida',
    });
  });

  /**
   * ESCALADA DE PRIVILÉGIO: quem é `user` não mexe no registro de outra pessoa.
   *
   * É o que separa `user` de `manager` — os dois trabalham, só o segundo responde pelo trabalho
   * alheio (CONTRIBUTING §7: toda escalada de privilégio tem teste).
   */
  it('refuses a plain user on a record created by someone else, with 403', async () => {
    const created = await registerMaintenance({
      otherMachine: 'Impressora da recepção',
      type: 'cleaning',
      performedAt: HOJE.toISOString(),
    }).expect(201);

    const refused = await request(app.getHttpServer())
      .patch(`/api/maintenances/${created.body.id}`)
      .set(asBia())
      .send({ description: 'Mexi no registro da Ana.' })
      .expect(403);

    expect(refused.body.message).toContain('foi criada por outra pessoa');

    await request(app.getHttpServer())
      .delete(`/api/maintenances/${created.body.id}`)
      .set(asBia())
      .expect(403);

    /* E o registro continua lá, com a descrição original. */
    const found = await request(app.getHttpServer())
      .get(`/api/maintenances/${created.body.id}`)
      .set(asAna())
      .expect(200);

    expect(found.body.description).toBeNull();
  });

  it('answers 404 for a maintenance that does not exist', async () => {
    await request(app.getHttpServer()).get('/api/maintenances/999999').set(asAna()).expect(404);
    await request(app.getHttpServer())
      .patch('/api/maintenances/999999')
      .set(asAna())
      .send({ description: 'Nada' })
      .expect(404);
    await request(app.getHttpServer()).delete('/api/maintenances/999999').set(asAna()).expect(404);
  });

  /* Apontar para uma máquina que não existe é recusado pelo BANCO, e chega como 4xx — não como
     "erro inesperado". */
  it('refuses a maintenance pointing at a machine that does not exist', async () => {
    const response = await registerMaintenance({
      computerId: 999999,
      type: 'cleaning',
      performedAt: HOJE.toISOString(),
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });
});
