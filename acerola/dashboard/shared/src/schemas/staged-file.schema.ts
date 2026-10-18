import { z } from 'zod';

import { fileNameSchema } from '../domain/file-name.util';

/**
 * O ENVIO DE ARQUIVO POR LINK ASSINADO.
 *
 * O arquivo nunca passa pela API. São três passos, nesta ordem, e a ordem é a regra:
 *
 *  1. a tela pede o link (`upload-url`) — a API confere quem pode e devolve uma chave da área
 *     temporária e um link assinado de vida curta;
 *  2. o navegador envia o arquivo DIRETO para o storage, por esse link (PUT);
 *  3. a tela grava o chamado, o histórico, o produto ou o orçamento mandando a chave — e só
 *     então a API confere o arquivo de verdade (tamanho e tipo medidos pelo storage) e o move
 *     para o lugar definitivo.
 *
 * O que ficou na área temporária sem ser gravado é apagado no dia seguinte.
 */

/** A pasta da área temporária, dentro do bucket. Nome em inglês: é infraestrutura. */
export const STAGING_FOLDER = 'tmp';

/** `tmp/<uuid>` com a extensão, se houver — o formato de `buildStagingKey`. */
export const STAGING_KEY_PATTERN = /^tmp\/[0-9a-f-]{36}(\.[a-z0-9]{1,8})?$/;

/**
 * O pedido do link: o que a tela sabe do arquivo ANTES de enviá-lo.
 *
 * É promessa, e só serve para recusar cedo o que nem adianta enviar. Quem vale é a conferência
 * do passo 3, com o que o storage mediu.
 */
export const uploadRequestSchema = z.object({
  fileName: fileNameSchema,
  contentType: z.string().trim().max(255),
  sizeBytes: z.number().int().positive(),
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;

/** A resposta do passo 1. */
export const uploadTicketSchema = z.object({
  /** A chave na área temporária — é ela que volta no passo 3. */
  storageKey: z.string(),
  /** O link para o PUT. Assinado e de vida curta: pedido na hora de enviar, nunca guardado. */
  uploadUrl: z.string(),
  /** Em segundos. */
  expiresIn: z.number().int().positive(),
});

export type UploadTicket = z.infer<typeof uploadTicketSchema>;

/**
 * O arquivo JÁ ENVIADO, como ele volta no passo 3: a chave da área temporária e o nome com que
 * a pessoa o escolheu (é o nome que aparece na tela e no download).
 */
export const stagedFileSchema = z.object({
  storageKey: z.string().trim().regex(STAGING_KEY_PATTERN, 'Arquivo temporário inválido.'),
  fileName: fileNameSchema,
});

export type StagedFile = z.infer<typeof stagedFileSchema>;

/**
 * Quantos arquivos cabem numa gravação. O limite de verdade é por formato, e é do domínio
 * (`attachment-catalog.util`); este número só impede uma lista de mil chaves antes disso.
 */
export const MAX_STAGED_FILES = 25;
