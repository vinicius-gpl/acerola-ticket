import { DeleteObjectCommand, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { describe, expect, it, vi } from 'vitest';

import { type Env } from '../config/env.schema';
import { buildObjectKey, StorageService } from './storage.service';

const env = {
  R2_BUCKET: 'arquivos',
  R2_SIGNED_URL_TTL_SECONDS: 300,
} as Env;

/** Um cliente do R2 que só anota o que recebeu, para o teste não falar com a Cloudflare. */
function fakeClient() {
  const sent: unknown[] = [];

  return {
    sent,
    client: { send: vi.fn(async (command: unknown) => void sent.push(command)) } as unknown as S3Client,
  };
}

describe('buildObjectKey', () => {
  // feliz
  it('puts the file in the folder and keeps the extension', () => {
    const key = buildObjectKey('tarefas', 'contrato.pdf');

    expect(key.startsWith('tarefas/')).toBe(true);
    expect(key.endsWith('.pdf')).toBe(true);
  });

  /* Dois envios com o MESMO nome não podem se sobrescrever em silêncio. */
  it('never repeats the address for the same file name', () => {
    expect(buildObjectKey('tarefas', 'contrato.pdf')).not.toBe(
      buildObjectKey('tarefas', 'contrato.pdf'),
    );
  });

  /* O nome original costuma dizer coisas sobre quem enviou; ele não vira endereço. */
  it('does not carry the original name into the address', () => {
    expect(buildObjectKey('tarefas', 'orcamento-cliente-fulano.pdf')).not.toContain('fulano');
  });

  // triste
  /* `../` no nome escaparia da pasta e escreveria onde não devia. */
  it('does not let the file name escape the folder (edge case)', () => {
    const key = buildObjectKey('tarefas', '../../etc/senha.pdf');

    expect(key.startsWith('tarefas/')).toBe(true);
    expect(key).not.toContain('..');
  });

  /* Arquivo que o navegador EXECUTA se for servido de volta perde a extensão. */
  it('strips extensions the browser would execute (edge case)', () => {
    expect(buildObjectKey('tarefas', 'ataque.html')).not.toContain('.html');
    expect(buildObjectKey('tarefas', 'ataque.svg')).not.toContain('.svg');
  });

  it('falls back to a safe folder when the folder is unusable (edge case)', () => {
    expect(buildObjectKey('../', 'x.pdf').startsWith('arquivos/')).toBe(true);
  });

  it('accepts a file with no extension at all (edge case)', () => {
    const key = buildObjectKey('tarefas', 'LEIAME');

    expect(key.startsWith('tarefas/')).toBe(true);
    expect(key).not.toContain('.');
  });
});

describe('StorageService', () => {
  // feliz
  it('sends the file to the configured bucket and reports where it went', async () => {
    const { client, sent } = fakeClient();
    const service = new StorageService(client, env);

    const stored = await service.upload({
      folder: 'tarefas',
      fileName: 'contrato.pdf',
      contentType: 'application/pdf',
      content: Buffer.from('conteudo'),
    });

    expect(stored.key.startsWith('tarefas/')).toBe(true);
    expect(stored.contentType).toBe('application/pdf');
    expect(stored.sizeBytes).toBe(8);

    const command = sent[0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input.Bucket).toBe('arquivos');
    expect(command.input.Key).toBe(stored.key);
  });

  it('deletes by address, in the configured bucket', async () => {
    const { client, sent } = fakeClient();
    const service = new StorageService(client, env);

    await service.remove('tarefas/abc.pdf');

    const command = sent[0] as DeleteObjectCommand;
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input).toMatchObject({ Bucket: 'arquivos', Key: 'tarefas/abc.pdf' });
  });

  // triste
  /* A falha do R2 precisa chegar a quem chamou: engolir faria a tela dizer que salvou. */
  it('lets a storage failure through instead of swallowing it', async () => {
    const client = { send: vi.fn().mockRejectedValue(new Error('R2 fora do ar')) } as unknown as S3Client;
    const service = new StorageService(client, env);

    await expect(
      service.upload({
        folder: 'tarefas',
        fileName: 'x.pdf',
        contentType: 'application/pdf',
        content: Buffer.from('x'),
      }),
    ).rejects.toThrow('R2 fora do ar');
  });
});
