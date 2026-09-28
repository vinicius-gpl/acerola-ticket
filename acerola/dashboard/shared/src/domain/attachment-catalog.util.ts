import { extensionOf } from './file-name.util';

/**
 * O QUE PODE SER ANEXADO a um chamado, e quanto de cada coisa.
 *
 * Um teto só para tudo não serve: um vídeo de defeito legitimamente pesa cinquenta vezes mais
 * que um print, e um teto alto o bastante para o vídeo deixaria alguém subir vinte planilhas
 * de 50 MB. Por isso cada formato tem o teto DELE, de tamanho e de quantidade.
 *
 * Esta é a única lista. A tela usa para montar o `accept` do campo e para avisar antes de
 * enviar; a API usa para recusar. Duas listas acabariam discordando, e a divergência
 * apareceria como "escolhi o arquivo e o envio falhou sem dizer por quê".
 */

export const ATTACHMENT_KINDS = ['pdf', 'word', 'excel', 'image', 'video'] as const;

export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

const MEGABYTE = 1024 * 1024;

export type AttachmentRule = {
  /** Como a tela chama esse grupo, em português. */
  label: string;
  /** Quantos arquivos desse grupo cabem num chamado. */
  maxCount: number;
  /** O teto de CADA arquivo do grupo. */
  maxBytes: number;
  /** Os tipos que o navegador informa ao escolher o arquivo. */
  mimeTypes: readonly string[];
  /** As extensões aceitas. O navegador erra o tipo com frequência — ver `attachmentKindOf`. */
  extensions: readonly string[];
};

export const ATTACHMENT_RULES: Record<AttachmentKind, AttachmentRule> = {
  pdf: {
    label: 'PDF',
    maxCount: 5,
    maxBytes: 10 * MEGABYTE,
    mimeTypes: ['application/pdf'],
    extensions: ['.pdf'],
  },
  word: {
    label: 'Word',
    maxCount: 5,
    maxBytes: 10 * MEGABYTE,
    mimeTypes: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    extensions: ['.doc', '.docx'],
  },
  excel: {
    label: 'Excel',
    maxCount: 5,
    maxBytes: 10 * MEGABYTE,
    mimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    extensions: ['.xls', '.xlsx'],
  },
  image: {
    label: 'Imagem',
    maxCount: 5,
    maxBytes: 5 * MEGABYTE,
    mimeTypes: ['image/png', 'image/jpeg'],
    extensions: ['.png', '.jpg', '.jpeg'],
  },
  video: {
    label: 'Vídeo',
    maxCount: 2,
    maxBytes: 50 * MEGABYTE,
    mimeTypes: ['video/mp4'],
    extensions: ['.mp4'],
  },
};

/**
 * De que grupo é este arquivo — ou nulo, se não for de nenhum.
 *
 * O tipo informado pelo navegador vem PRIMEIRO, e a extensão é a segunda tentativa: um Windows
 * sem o Office instalado manda `application/octet-stream` para um `.docx`, e recusar por isso
 * seria recusar justamente a planilha que a pessoa precisa anexar. A extensão sozinha nunca
 * abre a porta para um formato fora da lista — ela só desempata dentro dela.
 */
export function attachmentKindOf(contentType: string, fileName: string): AttachmentKind | null {
  const type = contentType.trim().toLowerCase();
  const byType = ATTACHMENT_KINDS.find((kind) => ATTACHMENT_RULES[kind].mimeTypes.includes(type));
  if (byType) return byType;

  const extension = extensionOf(fileName);
  if (!extension) return null;

  return (
    ATTACHMENT_KINDS.find((kind) => ATTACHMENT_RULES[kind].extensions.includes(extension)) ?? null
  );
}

/** O `accept` do campo de arquivo: extensões e tipos, que é como os navegadores filtram. */
export function attachmentAccept(): string {
  return ATTACHMENT_KINDS.flatMap((kind) => [
    ...ATTACHMENT_RULES[kind].extensions,
    ...ATTACHMENT_RULES[kind].mimeTypes,
  ]).join(',');
}

export type AttachmentRefusal = {
  /** A frase que aparece na tela, dizendo o que fazer. */
  message: string;
};

/**
 * Este arquivo cabe, sabendo o que o chamado já tem?
 *
 * Devolve nulo quando cabe, e o motivo quando não — em português, porque é texto de tela nas
 * duas pontas: a mesma frase que o formulário mostra antes de enviar é a que a API devolve se
 * alguém tentar pelo caminho de trás.
 */
export function refuseAttachment(
  file: { contentType: string; fileName: string; sizeBytes: number },
  existingKinds: readonly AttachmentKind[],
): AttachmentRefusal | null {
  const kind = attachmentKindOf(file.contentType, file.fileName);
  if (!kind) {
    return { message: `${file.fileName}: este tipo de arquivo não é aceito. ${acceptedSummary()}` };
  }

  const rule = ATTACHMENT_RULES[kind];

  if (file.sizeBytes > rule.maxBytes) {
    return {
      message: `${file.fileName}: ${rule.label.toLowerCase()} pode ter até ${megabytesOf(rule.maxBytes)}.`,
    };
  }

  const already = existingKinds.filter((existing) => existing === kind).length;
  if (already >= rule.maxCount) {
    return {
      message: `${file.fileName}: o limite é de ${rule.maxCount} ${pluralLabel(rule)} por chamado.`,
    };
  }

  return null;
}

/** A lista do que é aceito, para a mensagem de recusa dizer o que fazer. */
export function acceptedSummary(): string {
  return `Aceitos: ${ATTACHMENT_KINDS.map((kind) => ATTACHMENT_RULES[kind].label).join(', ')}.`;
}

export function megabytesOf(bytes: number): string {
  return `${Math.round(bytes / MEGABYTE)} MB`;
}

function pluralLabel(rule: AttachmentRule): string {
  /* "Vídeo" vira "vídeos", "PDF" vira "PDFs". Basta o `s` — nenhum rótulo da lista tem plural
     irregular, e inventar uma regra de plural para cinco palavras seria trabalho para nada. */
  return `${rule.label.toLowerCase()}s`;
}
