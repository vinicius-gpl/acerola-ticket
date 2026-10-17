import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { type StagedFile } from '@template/shared/schemas/staged-file.schema';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { MemoryStorage } from '../../../lib/storage/memory-storage';
import { StagedUploadsService } from '../../../lib/storage/staged-uploads.service';
import { type TicketAttachmentsRepository } from '../repository/ticket-attachments.repository';
import { type TicketsRepository } from '../repository/tickets.repository';
import { TicketAttachmentsService } from './ticket-attachments.service';

const MEGABYTE = 1024 * 1024;

const ana: RequestUser = { id: '1', email: 'ana@azuos.com.br', name: 'Ana', role: 'user' };
/** Ninguém identificado: é o que o guard bloquearia antes, e o que a policy recusa aqui. */
const noRole = { ...ana, role: undefined } as unknown as RequestUser;

const row = (over: Record<string, unknown> = {}) => ({
  id: 1,
  ticketId: 7,
  historyId: null,
  kind: 'pdf' as const,
  origin: 'requester' as const,
  fileName: 'nota.pdf',
  contentType: 'application/pdf',
  sizeBytes: MEGABYTE,
  storageKey: 'ticket-attachments/abc.pdf',
  createdAt: new Date('2026-09-28T12:00:00.000Z'),
  createdBy: null,
  ...over,
});

let sequence = 0;

/**
 * O que o navegador faz com o link: põe o arquivo na área temporária. Devolve o que a tela
 * manda depois, no corpo.
 */
async function sent(
  storage: MemoryStorage,
  over: { fileName?: string; contentType?: string; sizeBytes?: number } = {},
): Promise<StagedFile> {
  sequence += 1;
  const fileName = over.fileName ?? 'nota.pdf';
  const storageKey = `tmp/00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}.pdf`;
  await storage.put(
    storageKey,
    Buffer.alloc(over.sizeBytes ?? MEGABYTE),
    over.contentType ?? 'application/pdf',
  );

  return { storageKey, fileName };
}

function makeService(repository: Partial<TicketAttachmentsRepository> = {}, ticketExists = true) {
  const repositoryStub: Partial<TicketAttachmentsRepository> = {
    listByTicket: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockImplementation((input) => Promise.resolve(row(input))),
    findInTicket: vi.fn().mockResolvedValue(row()),
    remove: vi.fn().mockResolvedValue(undefined),
    ...repository,
  };

  const tickets: Partial<TicketsRepository> = {
    findById: vi.fn().mockResolvedValue(ticketExists ? { id: 7 } : null),
  };
  const storage = new MemoryStorage();

  return {
    service: new TicketAttachmentsService(
      repositoryStub as TicketAttachmentsRepository,
      tickets as TicketsRepository,
      new StagedUploadsService(storage),
      storage,
    ),
    repository: repositoryStub,
    storage,
  };
}

const PDF_REQUEST = { fileName: 'nota.pdf', contentType: 'application/pdf', sizeBytes: MEGABYTE };

describe('TicketAttachmentsService upload links', () => {
  // feliz
  it('hands the link to whoever attends the ticket', async () => {
    const { service } = makeService();

    const ticket = await service.createUploadTicket(ana, 7, PDF_REQUEST);

    expect(ticket.storageKey).toMatch(/^tmp\/[0-9a-f-]{36}\.pdf$/);
    expect(ticket.uploadUrl).toContain(ticket.storageKey);
  });

  // feliz
  it('hands the link to open a ticket with a screenshot', async () => {
    const { service } = makeService();

    const ticket = await service.createOpeningUploadTicket({
      fileName: 'erro.png',
      contentType: 'image/png',
      sizeBytes: MEGABYTE,
    });

    expect(ticket.storageKey).toMatch(/\.png$/);
  });

  // triste
  it('gives no link to someone who does not attend tickets', async () => {
    const { service } = makeService();

    await expect(service.createUploadTicket(noRole, 7, PDF_REQUEST)).rejects.toThrow(
      ForbiddenException,
    );
  });

  // triste
  it('gives no link for a ticket that does not exist', async () => {
    const { service } = makeService({}, false);

    await expect(service.createUploadTicket(ana, 99, PDF_REQUEST)).rejects.toThrow(
      NotFoundException,
    );
  });

  // triste
  it('refuses early what is not worth sending', async () => {
    const { service } = makeService();
    const zip = { fileName: 'tudo.zip', contentType: 'application/zip', sizeBytes: MEGABYTE };

    await expect(service.createUploadTicket(ana, 7, zip)).rejects.toThrow(BadRequestException);
    await expect(service.createOpeningUploadTicket(zip)).rejects.toThrow(BadRequestException);
  });
});

describe('TicketAttachmentsService.attach', () => {
  // feliz
  it('moves the file out of the staging area and hands back both links', async () => {
    const { service, storage } = makeService();
    const staged = await sent(storage);

    const [saved] = await service.attach(7, [staged], null, 'requester');

    expect(saved?.fileName).toBe('nota.pdf');
    expect(saved?.kind).toBe('pdf');
    expect(saved?.viewUrl).toMatch(/^memory:\/\/download\/ticket-attachments\//);
    expect(saved?.downloadUrl).toContain('download=nota.pdf');
    expect(await storage.head(staged.storageKey)).toBeNull();
  });

  /* O tamanho e o tipo gravados são os que o storage MEDIU, não os que a tela declarou. */
  it('records the size the storage measured', async () => {
    const { service, storage, repository } = makeService();

    await service.attach(7, [await sent(storage, { sizeBytes: 2048 })], null, 'requester');

    expect(repository.insert).toHaveBeenCalledWith(
      expect.objectContaining({ sizeBytes: 2048, contentType: 'application/pdf' }),
    );
  });

  /* Anexo que veio com a abertura do chamado não tem autor: ali não existe identidade, e
     carimbar uma diria que alguém do TI anexou o que a pessoa mandou. */
  it('leaves the author empty for what came with the ticket', async () => {
    const { service, storage } = makeService();

    const [saved] = await service.attach(7, [await sent(storage)], null, 'requester');

    expect(saved?.createdBy).toBeNull();
  });

  it('records who attached it when it came from the panel', async () => {
    const { service, storage } = makeService();

    const [saved] = await service.attachAsUser(ana, 7, [await sent(storage)]);

    expect(saved?.createdBy).toBe(ana.email);
  });

  // triste
  it('refuses a file that never reached the storage, saying which one', async () => {
    const { service, repository } = makeService();
    const missing = {
      storageKey: 'tmp/00000000-0000-4000-8000-999999999999.pdf',
      fileName: 'nota.pdf',
    };

    await expect(service.attach(7, [missing], null, 'requester')).rejects.toThrow(/nota\.pdf/);
    expect(repository.insert).not.toHaveBeenCalled();
  });

  // triste
  it('refuses a format that is not accepted, and clears it from the staging area', async () => {
    const { service, storage, repository } = makeService();
    const zip = await sent(storage, { fileName: 'tudo.zip', contentType: 'application/zip' });

    await expect(service.attach(7, [zip], null, 'requester')).rejects.toThrow(BadRequestException);

    expect(repository.insert).not.toHaveBeenCalled();
    expect(storage.size).toBe(0);
  });

  // triste
  /* A tela prometeu 1 MB ao pedir o link; o link aceita o que for enviado. Vale o medido. */
  it('refuses a file that turned out bigger than its format allows', async () => {
    const { service, storage } = makeService();
    const big = await sent(storage, { sizeBytes: 11 * MEGABYTE });

    await expect(service.attach(7, [big], null, 'requester')).rejects.toThrow(/até 10 MB/);
    expect(storage.size).toBe(0);
  });

  // triste
  it('lets a storage outage through instead of telling the person to send again', async () => {
    const { service, storage } = makeService();
    const staged = await sent(storage);
    vi.spyOn(storage, 'head').mockRejectedValue(new TypeError('fetch failed'));

    await expect(service.attach(7, [staged], null, 'requester')).rejects.toThrow('fetch failed');
  });

  // triste
  it('takes the moved file out of the bucket when the row cannot be written', async () => {
    const { service, storage } = makeService({
      insert: vi.fn().mockRejectedValue(new Error('db down')),
    });

    await expect(service.attach(7, [await sent(storage)], null, 'requester')).rejects.toThrow(
      'db down',
    );
    expect(storage.size).toBe(0);
  });

  /* Três vídeos de uma vez passariam pelo teto de dois se cada um fosse julgado contra o
     mesmo estado inicial — a conta precisa somar o que já entrou nesta mesma leva. */
  it('counts the files of the same batch against the limit', async () => {
    const { service, storage } = makeService();
    const video = () => sent(storage, { fileName: 'defeito.mp4', contentType: 'video/mp4' });

    await expect(
      service.attach(7, [await video(), await video(), await video()], null, 'requester'),
    ).rejects.toThrow(BadRequestException);
  });

  it('counts what the ticket already has', async () => {
    const { service, storage } = makeService({
      listByTicket: vi.fn().mockResolvedValue([row({ kind: 'video' }), row({ kind: 'video' })]),
    });
    const video = await sent(storage, { fileName: 'x.mp4', contentType: 'video/mp4' });

    await expect(service.attach(7, [video], null, 'requester')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('says the ticket was not found', async () => {
    const { service, storage } = makeService({}, false);

    await expect(service.attach(99, [await sent(storage)], null, 'requester')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('refuses an unidentified request from the panel', async () => {
    const { service, storage } = makeService();

    await expect(service.attachAsUser(noRole, 7, [await sent(storage)])).rejects.toThrow(
      ForbiddenException,
    );
  });
});

describe('TicketAttachmentsService.remove', () => {
  /** O anexo do TI: o que ele mesmo subiu durante o atendimento. */
  const supportFile = { findInTicket: vi.fn().mockResolvedValue(row({ origin: 'support' })) };

  // feliz
  it('takes the file the support side attached out of the ticket and out of the bucket', async () => {
    const { service, repository, storage } = makeService(supportFile);
    await storage.put('ticket-attachments/abc.pdf', Buffer.from('pdf'), 'application/pdf');

    await service.remove(ana, 7, 1);

    expect(repository.remove).toHaveBeenCalledWith(1);
    expect(await storage.head('ticket-attachments/abc.pdf')).toBeNull();
  });

  // triste
  /**
   * A REGRA NOVA, e é a mais importante deste arquivo.
   *
   * O arquivo que veio junto com a abertura é a PROVA de quem pediu socorro. Apagar o print
   * de alguém e depois dizer "não recebi print nenhum" é uma história que o sistema não pode
   * deixar acontecer — e a tela esconder o botão não basta: quem chama a API direto passaria
   * por cima.
   */
  it('never lets the support side delete what the requester sent', async () => {
    const { service, repository, storage } = makeService({
      findInTicket: vi.fn().mockResolvedValue(row({ origin: 'requester' })),
    });
    await storage.put('ticket-attachments/abc.pdf', Buffer.from('pdf'), 'application/pdf');

    await expect(service.remove(ana, 7, 1)).rejects.toThrow(ForbiddenException);
    expect(repository.remove).not.toHaveBeenCalled();
    /* Nem do banco, nem do bucket: um arquivo que some do R2 e fica na lista é pior ainda. */
    expect(await storage.head('ticket-attachments/abc.pdf')).not.toBeNull();
  });

  it('says whose file it is when it refuses', async () => {
    const { service } = makeService({
      findInTicket: vi.fn().mockResolvedValue(row({ origin: 'requester' })),
    });

    await expect(service.remove(ana, 7, 1)).rejects.toThrow(/quem abriu o chamado/);
  });

  /* O anexo é procurado DENTRO do chamado: sem isso, existiria um caminho para apagar o
     arquivo de um chamado passando o id de outro. */
  it('says not found for an attachment that is not in this ticket', async () => {
    const { service, repository } = makeService({ findInTicket: vi.fn().mockResolvedValue(null) });

    await expect(service.remove(ana, 7, 999)).rejects.toThrow(NotFoundException);
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it('refuses an unidentified request', async () => {
    const { service } = makeService(supportFile);

    await expect(service.remove(noRole, 7, 1)).rejects.toThrow(ForbiddenException);
  });
});

describe('a cota de arquivos é por lado', () => {
  // feliz
  /**
   * Com cota COMPARTILHADA, quem abrisse o chamado com cinco PDFs deixaria o TI sem poder
   * anexar a nota fiscal da peça — e o TI não poderia apagar nenhum dos cinco para abrir
   * espaço, porque não são dele. Um lado travaria o outro sem ter como destravar.
   */
  it('lets the support side attach even when the requester filled the quota', async () => {
    const full = Array.from({ length: 5 }, (_value, index) =>
      row({ id: index + 1, origin: 'requester' }),
    );
    const { service, storage } = makeService({ listByTicket: vi.fn().mockResolvedValue(full) });

    const [saved] = await service.attachAsUser(ana, 7, [await sent(storage)]);

    expect(saved?.origin).toBe('support');
  });

  // triste
  /* A cota continua existindo DENTRO de cada lado: cinco PDFs do TI e o sexto é recusado. */
  it('still refuses the sixth file of the same side', async () => {
    const full = Array.from({ length: 5 }, (_value, index) =>
      row({ id: index + 1, origin: 'support' }),
    );
    const { service, storage } = makeService({ listByTicket: vi.fn().mockResolvedValue(full) });

    await expect(service.attachAsUser(ana, 7, [await sent(storage)])).rejects.toThrow(
      BadRequestException,
    );
  });
});

describe('TicketAttachmentsService.list', () => {
  // feliz
  it('brings each file with a link to open and a link to download', async () => {
    const { service } = makeService({ listByTicket: vi.fn().mockResolvedValue([row()]) });

    const [first] = await service.list(7);

    expect(first?.viewUrl).toBe('memory://download/ticket-attachments/abc.pdf?expires=300');
    expect(first?.downloadUrl).toContain('download=nota.pdf');
  });

  // triste
  it('refuses an unidentified request from the panel', async () => {
    const { service } = makeService();

    await expect(service.listForUser(noRole, 7)).rejects.toThrow(ForbiddenException);
  });
});
