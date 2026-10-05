import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { optimizePhoto, PHOTO_CONTENT_TYPE } from './inventory-photo.util';

/* O Vitest sobe este `vi.mock` para ANTES das importações: quando o util importa o
   `child_process`, já recebe o de mentira. */
vi.mock('node:child_process', () => ({ spawn: vi.fn() }));

/**
 * Um ffmpeg DE MENTIRA: o processo de verdade é um programa de fora, e o que precisa de teste
 * é o que este arquivo faz com a resposta dele — não a conversão em si.
 */
function fakeFfmpeg(script: (process: FakeProcess) => void) {
  const fake = new EventEmitter() as FakeProcess;
  fake.stdout = new PassThrough();
  fake.stdin = new PassThrough();
  fake.kill = vi.fn();

  vi.mocked(spawn).mockImplementation(() => {
    /* O roteiro roda depois de quem chamou registrar os ouvintes. */
    queueMicrotask(() => script(fake));

    return fake as never;
  });

  return fake;
}

type FakeProcess = EventEmitter & {
  stdout: PassThrough;
  stdin: PassThrough;
  kill: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.mocked(spawn).mockReset();
});

describe('optimizePhoto', () => {
  // feliz
  it('gives back the converted image as webp', async () => {
    fakeFfmpeg((process) => {
      process.stdout.emit('data', Buffer.from('webp'));
      process.emit('close', 0);
    });

    const result = await optimizePhoto(Buffer.from('foto'));

    expect(result?.contentType).toBe(PHOTO_CONTENT_TYPE);
    expect(result?.content.toString()).toBe('webp');
  });

  it('joins everything that came out of the conversion', async () => {
    fakeFfmpeg((process) => {
      process.stdout.emit('data', Buffer.from('we'));
      process.stdout.emit('data', Buffer.from('bp'));
      process.emit('close', 0);
    });

    const result = await optimizePhoto(Buffer.from('foto'));

    expect(result?.content.toString()).toBe('webp');
  });

  // triste
  /* Falha do ffmpeg NÃO derruba o cadastro: quem chamou guarda a imagem original. */
  it('gives back nothing when the conversion fails', async () => {
    fakeFfmpeg((process) => process.emit('close', 1));

    await expect(optimizePhoto(Buffer.from('foto'))).resolves.toBeNull();
  });

  /* ffmpeg ausente na máquina: o `spawn` avisa pelo evento de erro, e não por exceção. */
  it('gives back nothing when ffmpeg is not there', async () => {
    fakeFfmpeg((process) => process.emit('error', new Error('spawn ffmpeg ENOENT')));

    await expect(optimizePhoto(Buffer.from('foto'))).resolves.toBeNull();
  });

  /* Saída vazia é falha disfarçada: um webp de zero byte quebraria a tela, não a conversão. */
  it('gives back nothing when the conversion produced an empty file (edge case)', async () => {
    fakeFfmpeg((process) => process.emit('close', 0));

    await expect(optimizePhoto(Buffer.from('foto'))).resolves.toBeNull();
  });

  /* Uma resposta só: erro no pipe e saída do processo chegam os dois. */
  it('answers once even when the error and the close arrive together (edge case)', async () => {
    fakeFfmpeg((process) => {
      process.stdin.emit('error', new Error('pipe fechado'));
      process.stdout.emit('data', Buffer.from('webp'));
      process.emit('close', 0);
    });

    await expect(optimizePhoto(Buffer.from('foto'))).resolves.toBeNull();
  });
});
