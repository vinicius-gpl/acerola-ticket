import { createHash } from 'node:crypto';

import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { type DocumentDefinition } from './document.type';
import { buildDocument } from './document.util';

const VERIFY_URL = 'http://localhost:5005/verify/a1b2c3d4e5f60718293a4b5c6d7e8f90';

/** Um documento com TODOS os tipos de bloco — o que cada gerador precisa saber desenhar. */
function definition(overrides: Partial<DocumentDefinition> = {}): DocumentDefinition {
  return {
    title: 'Ordem de serviço nº CH-0007',
    subtitle: 'Comprovante técnico de atendimento',
    reference: 'Ordem de serviço CH-0007 · Versão 1',
    orientation: 'portrait',
    createdAt: new Date('2026-03-02T11:00:00.000Z'),
    blocks: [
      {
        kind: 'badges',
        items: [
          { text: 'Resolvido', tone: 'success' },
          { text: 'Alta', tone: 'danger' },
        ],
      },
      {
        kind: 'fields',
        items: [
          { label: 'Quem abriu', value: 'Bia Costa' },
          { label: 'Departamento', value: 'Financeiro' },
          { label: 'Máquina', value: 'RECEPCAO-01' },
        ],
      },
      { kind: 'heading', text: 'Descrição do problema' },
      { kind: 'paragraph', text: 'A impressora não puxa papel.' },
      {
        kind: 'entries',
        emptyText: 'Nenhum histórico registrado.',
        items: [
          {
            badge: { text: 'Anotação', tone: 'info' },
            caption: 'Ana Lima · 01/03/2026, 06:30:00',
            details: 'Estágio depois: Em atendimento',
            body: 'Liguei para o fornecedor.',
            note: 'Anexos: orcamento.pdf',
          },
        ],
      },
      {
        kind: 'table',
        headers: ['Peça', 'Situação'],
        rows: [[{ text: 'Rolete' }, { text: 'Trocada', tone: 'success' }]],
        emptyText: 'Nenhuma peça usada.',
      },
    ],
    verification: {
      url: VERIFY_URL,
      displayUrl: 'http://localhost:5005/verify/a1b2c3d4',
      lines: ['Emitida em 02/03/2026 por Ana Lima', 'Código de verificação: a1b2c3d4'],
    },
    ...overrides,
  };
}

const fingerprint = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex');

async function sheetTexts(buffer: Buffer): Promise<string[]> {
  const workbook = new ExcelJS.Workbook();
  /* `Buffer` deste projeto e o `Buffer` que o ExcelJS espera vêm de versões diferentes de
     `@types/node` — o mesmo valor em tempo de execução, o TypeScript é que enxerga dois tipos. */
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

  const texts: string[] = [];
  workbook.worksheets[0]?.eachRow((row) => {
    row.eachCell((cell) => texts.push(cell.text));
  });

  return texts;
}

describe('buildDocument', () => {
  // feliz
  it('names the file after the format and tells the browser what it is', async () => {
    const pdf = await buildDocument(definition(), 'pdf', 'ordem-de-servico');
    const docx = await buildDocument(definition(), 'docx', 'ordem-de-servico');
    const xlsx = await buildDocument(definition(), 'xlsx', 'ordem-de-servico');

    expect(pdf).toMatchObject({ fileName: 'ordem-de-servico.pdf', contentType: 'application/pdf' });
    expect(docx.fileName).toBe('ordem-de-servico.docx');
    expect(xlsx.fileName).toBe('ordem-de-servico.xlsx');
  });

  it('draws every kind of block in the three formats, from the same definition', async () => {
    const pdf = await buildDocument(definition(), 'pdf', 'documento');
    const docx = await buildDocument(definition(), 'docx', 'documento');
    const xlsx = await buildDocument(definition(), 'xlsx', 'documento');

    expect(pdf.buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    /* .docx e .xlsx são zips (OOXML): os dois primeiros bytes são sempre "PK". */
    expect(docx.buffer.subarray(0, 2).toString('ascii')).toBe('PK');
    expect(xlsx.buffer.subarray(0, 2).toString('ascii')).toBe('PK');
  });

  /* A logo vai embutida nos TRÊS arquivos — é ela que assina o documento. Cada formato guarda
     a imagem do seu jeito: o PDF como objeto de imagem, o Word e o Excel numa pasta `media`
     dentro do zip (o nome da pasta fica em texto puro no arquivo). */
  it('carries the brand logo inside the three files', async () => {
    const pdf = await buildDocument(definition(), 'pdf', 'documento');
    const docx = await buildDocument(definition(), 'docx', 'documento');
    const xlsx = await buildDocument(definition(), 'xlsx', 'documento');

    expect(pdf.buffer.toString('latin1')).toMatch(/\/Subtype\s*\/Image/);
    expect(docx.buffer.toString('latin1')).toContain('word/media/');
    expect(xlsx.buffer.toString('latin1')).toContain('xl/media/');
  });

  it('writes in the spreadsheet what the definition says, block after block', async () => {
    const xlsx = await buildDocument(definition(), 'xlsx', 'documento');
    const texts = await sheetTexts(xlsx.buffer);

    expect(texts).toEqual(
      expect.arrayContaining([
        'Ordem de serviço nº CH-0007',
        'Resolvido',
        'Quem abriu',
        'Bia Costa',
        'DESCRIÇÃO DO PROBLEMA',
        'A impressora não puxa papel.',
        'Liguei para o fornecedor.',
        'Anexos: orcamento.pdf',
        'Rolete',
        'Trocada',
        'http://localhost:5005/verify/a1b2c3d4',
      ]),
    );
  });

  /* O link de conferência vai dentro do PDF, com o endereço INTEIRO — é ele que é clicável. */
  it('carries the whole verification link inside the PDF', async () => {
    const pdf = await buildDocument(definition(), 'pdf', 'documento');

    expect(pdf.buffer.toString('latin1')).toContain(VERIFY_URL);
  });

  /* É o que deixa o sistema conferir um arquivo sem ter guardado o arquivo: a mesma definição
     com a mesma data dá o mesmo PDF, byte a byte — mesmo desenhado em outro momento. */
  it('draws the very same PDF again for the same definition', async () => {
    const first = await buildDocument(definition(), 'pdf', 'documento');
    const second = await buildDocument(definition(), 'pdf', 'documento');

    expect(fingerprint(second.buffer)).toBe(fingerprint(first.buffer));
  });

  // triste
  it('draws a different PDF when anything in the definition changed', async () => {
    const before = await buildDocument(definition(), 'pdf', 'documento');
    const after = await buildDocument(definition({ subtitle: 'Outro subtítulo' }), 'pdf', 'documento');

    expect(fingerprint(after.buffer)).not.toBe(fingerprint(before.buffer));
  });

  /* Um documento sem bloco nenhum ainda é um documento da casa: a logo não depende do conteúdo. */
  it('still signs with the logo a document with no blocks at all', async () => {
    const bare = definition({ blocks: [], verification: undefined });

    const docx = await buildDocument(bare, 'docx', 'vazio');
    const xlsx = await buildDocument(bare, 'xlsx', 'vazio');

    expect(docx.buffer.toString('latin1')).toContain('word/media/');
    expect(xlsx.buffer.toString('latin1')).toContain('xl/media/');
  });

  it('still builds the three files for a document with nothing in it', async () => {
    const empty = definition({
      subtitle: undefined,
      verification: undefined,
      blocks: [
        { kind: 'badges', items: [] },
        { kind: 'fields', items: [] },
        { kind: 'entries', items: [], emptyText: 'Nenhum histórico registrado.' },
        { kind: 'table', headers: ['Peça'], rows: [], emptyText: 'Nenhuma peça usada.' },
      ],
    });

    const pdf = await buildDocument(empty, 'pdf', 'vazio');
    const docx = await buildDocument(empty, 'docx', 'vazio');
    const xlsx = await buildDocument(empty, 'xlsx', 'vazio');

    expect(pdf.buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(docx.buffer.subarray(0, 2).toString('ascii')).toBe('PK');
    expect(await sheetTexts(xlsx.buffer)).toEqual(
      expect.arrayContaining(['Nenhum histórico registrado.', 'Nenhuma peça usada.']),
    );
  });

  /* O nome da planilha não aceita barra nem dois-pontos: um título com eles não pode derrubar
     a exportação. */
  it('builds the spreadsheet even when the title has characters a sheet name refuses', async () => {
    const xlsx = await buildDocument(definition({ title: 'Chamados: infra/sistema' }), 'xlsx', 'documento');

    expect(xlsx.buffer.subarray(0, 2).toString('ascii')).toBe('PK');
  });
});
