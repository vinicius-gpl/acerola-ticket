import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type StorageService } from '../../../lib/storage/storage.service';
import { type TicketAttachmentsRepository } from '../repository/ticket-attachments.repository';
import { type TicketsRepository } from '../repository/tickets.repository';
import { TicketAttachmentsService, type UploadedAttachment } from './ticket-attachments.service';

const MEGABYTE = 1024 * 1024;

const ana: RequestUser = { id: '1', email: 'ana@azuos.com.br', name: 'Ana', role: 'user' };
/** Ninguém identificado: é o que o guard bloquearia antes, e o que a policy recusa aqui. */
const noRole = { ...ana, role: undefined } as unknown as RequestUser;

const file = (over: Partial<UploadedAttachment> = {}): UploadedAttachment => ({
  originalname: 'nota.pdf',
  mimetype: 'application/pdf',
  size: MEGABYTE,
  buffer: Buffer.from('conteudo'),
  ...over,
});

const row = (over: Record<string, unknown> = {}) => ({
  id: 1,
  ticketId: 7,
  kind: 'pdf' as const,
  fileName: 'nota.pdf',
  contentType: 'application/pdf',
  sizeBytes: MEGABYTE,
  storageKey: 'chamados-anexos/abc.pdf',
  createdAt: new Date('2026-09-28T12:00:00.000Z'),
  createdBy: null,
  ...over,
});

function makeService(
  repository: Partial<TicketAttachmentsRepository> = {},
  ticketExists = true,
  storage: Partial<StorageService> = {},
) {
  const repositoryStub: Partial<TicketAttachmentsRepository> = {
    listByTicket: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockImplementation((input) => Promise.resolve(row(input))),
    findInTicket: vi.fn().mockResolvedValue(row()),
    remove: vi.fn().mockResolvedValue(undefined),
    ...repository,
  };

  const storageStub: Partial<StorageService> = {
    upload: vi
      .fn()
      .mockImplementation((input) =>
        Promise.resolve({
          key: 'chamados-anexos/abc',
          contentType: input.contentType,
          sizeBytes: 10,
        }),
      ),
    createDownloadUrl: vi.fn().mockResolvedValue('https://r2.example/assinado'),
    remove: vi.fn().mockResolvedValue(undefined),
    ...storage,
  };

  const tickets: Partial<TicketsRepository> = {
    findById: vi.fn().mockResolvedValue(ticketExists ? { id: 7 } : null),
  };

  return {
    service: new TicketAttachmentsService(
      repositoryStub as TicketAttachmentsRepository,
      tickets as TicketsRepository,
      storageStub as StorageService,
    ),
    repository: repositoryStub,
    storage: storageStub,
  };
}

describe('TicketAttachmentsService.attach', () => {
  // feliz
  it('stores the file and hands back both links', async () => {
    const { service } = makeService();

    const [saved] = await service.attach(7, [file()], null);

    expect(saved?.fileName).toBe('nota.pdf');
    expect(saved?.kind).toBe('pdf');
    expect(saved?.viewUrl).toBeTruthy();
    expect(saved?.downloadUrl).toBeTruthy();
  });

  /* Anexo que veio com a abertura do chamado não tem autor: ali não existe identidade, e
     carimbar uma diria que alguém do TI anexou o que a pessoa mandou. */
  it('leaves the author empty for what came with the ticket', async () => {
    const { service } = makeService();

    const [saved] = await service.attach(7, [file()], null);

    expect(saved?.createdBy).toBeNull();
  });

  it('records who attached it when it came from the panel', async () => {
    const { service } = makeService();

    const [saved] = await service.attachAsUser(ana, 7, [file()]);

    expect(saved?.createdBy).toBe(ana.email);
  });

  // triste
  it('refuses a format that is not accepted, without storing anything', async () => {
    const { service, storage } = makeService();

    await expect(
      service.attach(7, [file({ originalname: 'tudo.zip', mimetype: 'application/zip' })], null),
    ).rejects.toThrow(BadRequestException);

    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('refuses a file over the size of its format', async () => {
    const { service } = makeService();

    await expect(service.attach(7, [file({ size: 11 * MEGABYTE })], null)).rejects.toThrow(
      BadRequestException,
    );
  });

  /* Três vídeos de uma vez passariam pelo teto de dois se cada um fosse julgado contra o
     mesmo estado inicial — a conta precisa somar o que já entrou nesta mesma leva. */
  it('counts the files of the same batch against the limit', async () => {
    const { service } = makeService();
    const video = file({ originalname: 'defeito.mp4', mimetype: 'video/mp4', size: MEGABYTE });

    await expect(service.attach(7, [video, video, video], null)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('counts what the ticket already has', async () => {
    const { service } = makeService({
      listByTicket: vi.fn().mockResolvedValue([row({ kind: 'video' }), row({ kind: 'video' })]),
    });

    await expect(
      service.attach(7, [file({ originalname: 'x.mp4', mimetype: 'video/mp4' })], null),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuses a file name that is trying to be a path', async () => {
    const { service } = makeService();

    await expect(
      service.attach(7, [file({ originalname: '../../etc/senha.pdf' })], null),
    ).rejects.toThrow(BadRequestException);
  });

  it('says the ticket was not found', async () => {
    const { service } = makeService({}, false);

    await expect(service.attach(99, [file()], null)).rejects.toThrow(NotFoundException);
  });

  it('refuses an unidentified request from the panel', async () => {
    const { service } = makeService();

    await expect(service.attachAsUser(noRole, 7, [file()])).rejects.toThrow(ForbiddenException);
  });
});

describe('TicketAttachmentsService.remove', () => {
  // feliz
  it('takes the file out of the ticket and out of the bucket', async () => {
    const { service, repository, storage } = makeService();

    await service.remove(ana, 7, 1);

    expect(repository.remove).toHaveBeenCalledWith(1);
    expect(storage.remove).toHaveBeenCalledWith('chamados-anexos/abc.pdf');
  });

  // triste
  /* O anexo é procurado DENTRO do chamado: sem isso, existiria um caminho para apagar o
     arquivo de um chamado passando o id de outro. */
  it('says not found for an attachment that is not in this ticket', async () => {
    const { service, storage } = makeService({ findInTicket: vi.fn().mockResolvedValue(null) });

    await expect(service.remove(ana, 7, 999)).rejects.toThrow(NotFoundException);
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('refuses an unidentified request', async () => {
    const { service } = makeService();

    await expect(service.remove(noRole, 7, 1)).rejects.toThrow(ForbiddenException);
  });
});

describe('TicketAttachmentsService.list', () => {
  // feliz
  it('brings each file with a link to open and a link to download', async () => {
    const { service } = makeService({ listByTicket: vi.fn().mockResolvedValue([row()]) });

    const [first] = await service.list(7);

    expect(first?.viewUrl).toBeTruthy();
    expect(first?.downloadUrl).toBeTruthy();
  });

  // triste
  it('refuses an unidentified request from the panel', async () => {
    const { service } = makeService();

    await expect(service.listForUser(noRole, 7)).rejects.toThrow(ForbiddenException);
  });
});
