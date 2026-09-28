import { describe, expect, it } from 'vitest';

import { extensionOf, FILE_NAME_MAX_LENGTH, fileNameSchema } from './file-name.util';

const parse = (value: string) => fileNameSchema.safeParse(value);

describe('fileNameSchema', () => {
  // feliz
  it('accepts an ordinary name', () => {
    expect(parse('Nota fiscal 2026.pdf').data).toBe('Nota fiscal 2026.pdf');
  });

  it('accepts accents and the punctuation people actually use', () => {
    expect(parse('relatório (final) - v2.xlsx').success).toBe(true);
  });

  /* Espaço em volta e ponto no fim são engano de quem arrasta o arquivo, não intenção: recusar
     por isso trocaria um envio que funciona por uma mensagem de erro. */
  it('cleans up what is only sloppiness', () => {
    expect(parse('  contrato.docx  ').data).toBe('contrato.docx');
    expect(parse('foto.png...').data).toBe('foto.png');
  });

  // triste
  it('refuses a name that is trying to be a path', () => {
    expect(parse('../../etc/senha.pdf').success).toBe(false);
    expect(parse('C:\\Windows\\system32\\x.pdf').success).toBe(false);
    expect(parse('..').success).toBe(false);
  });

  /* Aspas e quebra de linha quebram o cabeçalho do download; invisíveis escondem a extensão
     real (`nota.pdf<RLO>exe` aparece como `nota.exe` de trás para a frente). */
  it('refuses what would break the download header or hide the real extension', () => {
    expect(parse('nota".pdf').success).toBe(false);
    expect(parse('nota\n.pdf').success).toBe(false);
    expect(parse('nota\u202Efdp.exe').success).toBe(false);
  });

  it('refuses an empty name', () => {
    expect(parse('').success).toBe(false);
    expect(parse('    ').success).toBe(false);
  });

  it('refuses a name longer than the limit, saying the limit', () => {
    const result = parse(`${'a'.repeat(FILE_NAME_MAX_LENGTH + 1)}.pdf`);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain(String(FILE_NAME_MAX_LENGTH));
  });
});

describe('extensionOf', () => {
  // feliz
  it('reads the extension in lower case', () => {
    expect(extensionOf('Relatorio.PDF')).toBe('.pdf');
    expect(extensionOf('foto.final.JPEG')).toBe('.jpeg');
  });

  // triste
  it('answers nothing when there is no extension to read', () => {
    expect(extensionOf('arquivo')).toBe('');
    expect(extensionOf('arquivo.')).toBe('');
    expect(extensionOf('arquivo.extensaolonguissima')).toBe('');
  });
});
