import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  compileTypstDocument,
  resolveTypstRootDir,
} from './typst-compiler.util';

const fingerprint = (buf: Buffer) => createHash('sha256').update(buf).digest('hex');

describe('resolveTypstRootDir', () => {
  // feliz
  it('localiza a pasta raiz contendo o template.typ e fonts/', () => {
    const root = resolveTypstRootDir();
    expect(existsSync(join(root, 'template.typ'))).toBe(true);
    expect(existsSync(join(root, 'fonts'))).toBe(true);
  });
});

describe('compileTypstDocument', () => {
  // feliz
  it('compila um documento Typst para PDF retornando buffer válido', async () => {
    const pdfBuffer = await compileTypstDocument({
      documentPath: 'documents/service-order.typ',
      data: {
        protocol: 'CH-TEST-01',
        status: 'Resolvido',
        statusTone: 'success',
        requesterName: 'Usuário Teste',
        description: 'Chamado de teste de integração do compilador',
      },
    });

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  // feliz
  it('produz saída 100% determinística (mesmo SHA-256) com o mesmo creationTimestamp', async () => {
    const options = {
      documentPath: 'documents/service-order.typ',
      data: {
        protocol: 'CH-DETERMINISTIC',
        code: 'det-code-12345',
        requesterName: 'Ana Silva',
        description: 'Verificação de hash idêntico',
      },
      creationTimestamp: 1772449200,
    };

    const run1 = await compileTypstDocument(options);
    const run2 = await compileTypstDocument(options);

    expect(fingerprint(run1)).toBe(fingerprint(run2));
  });

  // triste
  it('lança erro explicativo quando o arquivo .typ não existe', async () => {
    await expect(
      compileTypstDocument({
        documentPath: 'documents/arquivo-inexistente.typ',
      }),
    ).rejects.toThrow('Documento Typst não encontrado');
  });
});
