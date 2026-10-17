import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type WhatsappConnectionsRepository } from '../repository/whatsapp-connections.repository';
import { type BotClientService, type BotStatus } from './bot-client.service';
import { WhatsappLinkService } from './whatsapp-link.service';
import { type WhatsappMessagingService } from './whatsapp-messaging.service';

const admin: RequestUser = {
  id: 'u-admin',
  email: 'ana@exemplo.com',
  name: 'Ana Lima',
  role: 'admin',
};
const infraAdmin: RequestUser = {
  id: 'u-infra',
  email: 'bia@exemplo.com',
  name: 'Bia Costa',
  role: 'user',
  roles: { infra: 'admin', sistema: 'user', manutencao: 'user' },
};
const regular: RequestUser = {
  id: 'u-user',
  email: 'caio@exemplo.com',
  name: 'Caio Reis',
  role: 'user',
};

const CONNECTED: BotStatus = { state: 'connected', qr: null, phone: '5562999990001' };
const PAIRING: BotStatus = { state: 'pairing', qr: 'qr-content', phone: null };
const DISCONNECTED: BotStatus = { state: 'disconnected', qr: null, phone: null };
const USAGE = { sentToday: 3, dailyLimit: 100 };

function makeService(
  options: {
    bot?: BotStatus;
    isConfigured?: boolean;
    stored?: string | null;
    storedName?: string | null;
  } = {},
) {
  const bot = {
    isConfigured: options.isConfigured ?? true,
    status: vi.fn().mockResolvedValue(options.bot ?? DISCONNECTED),
    link: vi.fn().mockResolvedValue(options.bot ?? PAIRING),
    unlink: vi.fn().mockResolvedValue(undefined),
  };
  const repository = {
    find: vi.fn().mockResolvedValue(
      options.stored
        ? {
            userId: 'u-admin',
            phone: options.stored,
            operatorName: options.storedName === undefined ? 'Ana Lima' : options.storedName,
          }
        : null,
    ),
    save: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  const messaging = { usage: vi.fn().mockResolvedValue(USAGE) };
  const service = new WhatsappLinkService(
    bot as unknown as BotClientService,
    repository as unknown as WhatsappConnectionsRepository,
    messaging as unknown as WhatsappMessagingService,
  );

  return { service, bot, repository };
}

describe('WhatsappLinkService.status', () => {
  // feliz
  it('tells a connected admin the number that is linked, and records it', async () => {
    const { service, repository } = makeService({ bot: CONNECTED });

    expect(await service.status(admin)).toEqual({
      isConfigured: true,
      canLink: true,
      ...CONNECTED,
      ...USAGE,
    });
    expect(repository.save).toHaveBeenCalledWith('u-admin', '5562999990001', 'Ana Lima');
  });

  it('hands the QR code to whoever is pairing, without recording anything', async () => {
    const { service, repository } = makeService({ bot: PAIRING });

    expect(await service.status(admin)).toMatchObject({ state: 'pairing', qr: 'qr-content' });
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it('does not write again when the recorded number is already the linked one', async () => {
    const { service, repository } = makeService({ bot: CONNECTED, stored: '5562999990001' });

    await service.status(admin);

    expect(repository.save).not.toHaveBeenCalled();
  });

  /* Vínculo de antes da assinatura: o nome de quem vinculou é guardado na próxima leitura. */
  it('records the operator name on a link made before it was kept', async () => {
    const { service, repository } = makeService({
      bot: CONNECTED,
      stored: '5562999990001',
      storedName: null,
    });

    await service.status(admin);

    expect(repository.save).toHaveBeenCalledWith('u-admin', '5562999990001', 'Ana Lima');
  });

  /* Desvinculado pelo próprio celular: o bot passa a dizer "sem vínculo", e a tabela acompanha. */
  it('forgets the recorded number once the bot says there is no link anymore', async () => {
    const { service, repository } = makeService({ bot: DISCONNECTED, stored: '5562999990001' });

    await service.status(admin);

    expect(repository.remove).toHaveBeenCalledWith('u-admin');
  });

  // triste
  /* Quem não pode vincular não recebe erro: recebe "não pode", e o bot nem é consultado. */
  it('tells a regular user that linking is not for them, without asking the bot', async () => {
    const { service, bot } = makeService({ bot: CONNECTED });

    expect(await service.status(regular)).toEqual({
      isConfigured: true,
      canLink: false,
      ...DISCONNECTED,
      ...USAGE,
    });
    expect(bot.status).not.toHaveBeenCalled();
  });

  it('says the integration is not configured instead of failing', async () => {
    const { service, bot } = makeService({ isConfigured: false });

    expect(await service.status(admin)).toEqual({
      isConfigured: false,
      canLink: true,
      ...DISCONNECTED,
      ...USAGE,
    });
    expect(bot.status).not.toHaveBeenCalled();
  });
});

describe('WhatsappLinkService.link', () => {
  // feliz
  it('starts the link for a general admin, under their own identity', async () => {
    const { service, bot } = makeService();

    expect(await service.link(admin)).toMatchObject({ state: 'pairing', qr: 'qr-content' });
    expect(bot.link).toHaveBeenCalledWith('u-admin');
  });

  it('starts the link for the admin of a single area', async () => {
    const { service, bot } = makeService();

    await service.link(infraAdmin);

    expect(bot.link).toHaveBeenCalledWith('u-infra');
  });

  // triste
  /* Escalada de privilégio: usuário comum não chega nem a falar com o bot. */
  it('refuses a regular user before touching the bot', async () => {
    const { service, bot } = makeService();

    await expect(service.link(regular)).rejects.toThrow(ForbiddenException);
    expect(bot.link).not.toHaveBeenCalled();
  });
});

describe('WhatsappLinkService.unlink', () => {
  // feliz
  it('unlinks on the bot and forgets the recorded number', async () => {
    const { service, bot, repository } = makeService({ stored: '5562999990001' });

    await service.unlink(admin);

    expect(bot.unlink).toHaveBeenCalledWith('u-admin');
    expect(repository.remove).toHaveBeenCalledWith('u-admin');
  });

  // triste
  it('refuses a regular user', async () => {
    const { service, bot, repository } = makeService();

    await expect(service.unlink(regular)).rejects.toThrow(ForbiddenException);
    expect(bot.unlink).not.toHaveBeenCalled();
    expect(repository.remove).not.toHaveBeenCalled();
  });

  /* Se o bot falhar, o registro fica: apagar aqui diria "desvinculado" com o número ainda conectado. */
  it('keeps the recorded number when the bot fails to unlink', async () => {
    const { service, bot, repository } = makeService({ stored: '5562999990001' });
    bot.unlink.mockRejectedValue(new Error('bot down'));

    await expect(service.unlink(admin)).rejects.toThrow('bot down');
    expect(repository.remove).not.toHaveBeenCalled();
  });
});
