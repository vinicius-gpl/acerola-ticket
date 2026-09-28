import { z } from 'zod';

import { ATTACHMENT_KINDS } from '../domain/attachment-catalog.util';
import { fileNameSchema } from '../domain/file-name.util';

/**
 * O CONTRATO do anexo de um chamado.
 *
 * O chamado já tinha um print, e só um. Anexo é outra coisa: são vários arquivos, de formatos
 * diferentes, cada um com o teto dele (ver `attachment-catalog.util`) — a nota fiscal da peça,
 * a foto do antes e do depois, o vídeo do defeito que não dá para descrever por escrito.
 *
 * **Os dois endereços são temporários e assinados.** O bucket é privado, e o link é gerado a
 * cada leitura com validade curta. Endereço fixo vazado vira acesso permanente ao arquivo.
 */

export const attachmentKindSchema = z.enum(ATTACHMENT_KINDS);

export const ticketAttachmentSchema = z.object({
  id: z.number().int(),
  ticketId: z.number().int(),
  kind: attachmentKindSchema,
  /** O nome que veio do computador de quem enviou. Nunca é o endereço no bucket. */
  fileName: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  /**
   * ABRIR: o navegador mostra o arquivo na tela (PDF, imagem, vídeo tocam ali mesmo).
   *
   * Separado do baixar porque são gestos diferentes: quem está atendendo quer OLHAR a foto
   * sem encher a pasta de downloads, e quem vai anexar a nota no processo quer o arquivo.
   */
  viewUrl: z.string(),
  /** BAIXAR: o mesmo arquivo, com o nome original, entregue como download. */
  downloadUrl: z.string(),
  createdAt: z.string().datetime(),
  /**
   * Quem anexou, quando foi o TI. Nulo quando veio junto com a abertura do chamado — ali não
   * existe identidade, e inventar uma diria que alguém do TI anexou o que a pessoa mandou.
   */
  createdBy: z.string().nullable(),
});

export type TicketAttachment = z.infer<typeof ticketAttachmentSchema>;

/**
 * O que a API precisa saber de um arquivo ANTES de aceitá-lo.
 *
 * O conteúdo não está aqui: ele viaja como arquivo na mesma requisição, e validar bytes é
 * trabalho de quem os lê, não do Zod. O que o schema garante é o resto — e o nome do arquivo
 * passa pela mesma régua do AnyDesk e do telefone (`file-name.util`).
 */
export const attachmentFileSchema = z.object({
  fileName: fileNameSchema,
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

export type AttachmentFile = z.infer<typeof attachmentFileSchema>;

/** A resposta de listar: os anexos de um chamado, do mais antigo para o mais novo. */
export const ticketAttachmentListSchema = z.object({
  attachments: z.array(ticketAttachmentSchema),
});

export type TicketAttachmentList = z.infer<typeof ticketAttachmentListSchema>;
