import { describe, expect, it } from 'vitest';

import {
  ATTACHMENT_KINDS,
  ATTACHMENT_RULES,
  attachmentAccept,
  attachmentKindOf,
  refuseAttachment,
  type AttachmentKind,
} from './attachment-catalog.util';

const MEGABYTE = 1024 * 1024;

const file = (over: Partial<Parameters<typeof refuseAttachment>[0]> = {}) => ({
  contentType: 'application/pdf',
  fileName: 'nota.pdf',
  sizeBytes: MEGABYTE,
  ...over,
});

describe('attachmentKindOf', () => {
  // feliz
  it('recognises each accepted format by what the browser says', () => {
    expect(attachmentKindOf('application/pdf', 'x.pdf')).toBe('pdf');
    expect(attachmentKindOf('image/png', 'x.png')).toBe('image');
    expect(attachmentKindOf('image/jpeg', 'x.jpg')).toBe('image');
    expect(attachmentKindOf('video/mp4', 'x.mp4')).toBe('video');
    expect(
      attachmentKindOf(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'x.xlsx',
      ),
    ).toBe('excel');
  });

  /* Windows sem Office manda `application/octet-stream` para um .docx. Recusar por isso seria
     recusar justamente o documento que a pessoa precisa anexar. */
  it('falls back to the extension when the browser does not know the type', () => {
    expect(attachmentKindOf('application/octet-stream', 'contrato.docx')).toBe('word');
    expect(attachmentKindOf('', 'planilha.xls')).toBe('excel');
  });

  // triste
  it('refuses a format that is not on the list', () => {
    expect(attachmentKindOf('application/zip', 'tudo.zip')).toBeNull();
    expect(attachmentKindOf('text/html', 'pagina.html')).toBeNull();
  });

  /* A extensão desempata DENTRO da lista; ela nunca abre a porta para o que está fora dela. */
  it('does not let an unknown type in through a made-up extension', () => {
    expect(attachmentKindOf('application/x-msdownload', 'virus.exe')).toBeNull();
    expect(attachmentKindOf('application/octet-stream', 'sem-extensao')).toBeNull();
  });
});

describe('refuseAttachment', () => {
  // feliz
  it('lets through a file that fits', () => {
    expect(refuseAttachment(file(), [])).toBeNull();
  });

  it('counts each format separately', () => {
    /* Cinco PDFs não gastam a cota de vídeo: os tetos são por formato, e é justamente isso
       que permite um vídeo grande sem liberar vinte planilhas grandes. */
    const fivePdfs: AttachmentKind[] = ['pdf', 'pdf', 'pdf', 'pdf', 'pdf'];

    expect(
      refuseAttachment(file({ contentType: 'video/mp4', fileName: 'x.mp4' }), fivePdfs),
    ).toBeNull();
  });

  // triste
  it('refuses a file over the size of its own format, saying the limit', () => {
    const refusal = refuseAttachment(file({ sizeBytes: 11 * MEGABYTE }), []);

    expect(refusal?.message).toContain('10 MB');
    expect(refusal?.message).toContain('nota.pdf');
  });

  it('refuses one file over another format limit', () => {
    /* Cinco megabytes passam num PDF e não passam numa imagem: é a mesma medida com régua
       diferente, e a mensagem precisa dizer qual régua reprovou. */
    expect(refuseAttachment(file({ sizeBytes: 6 * MEGABYTE }), [])).toBeNull();
    expect(
      refuseAttachment(
        file({ contentType: 'image/png', fileName: 'tela.png', sizeBytes: 6 * MEGABYTE }),
        [],
      ),
    ).not.toBeNull();
  });

  it('refuses when the format already hit its count', () => {
    const twoVideos: AttachmentKind[] = ['video', 'video'];
    const refusal = refuseAttachment(
      file({ contentType: 'video/mp4', fileName: 'defeito.mp4' }),
      twoVideos,
    );

    expect(refusal?.message).toContain('2');
    expect(refusal?.message).toContain('vídeos');
  });

  it('refuses a format that is not accepted, saying what is', () => {
    const refusal = refuseAttachment(
      file({ contentType: 'application/zip', fileName: 'tudo.zip' }),
      [],
    );

    expect(refusal?.message).toContain('Aceitos');
    expect(refusal?.message).toContain('PDF');
  });
});

describe('attachmentAccept', () => {
  // feliz
  it('offers every accepted extension to the file picker', () => {
    const accept = attachmentAccept();

    for (const kind of ATTACHMENT_KINDS) {
      for (const extension of ATTACHMENT_RULES[kind].extensions) {
        expect(accept).toContain(extension);
      }
    }
  });
});
