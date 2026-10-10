import { ATTACHMENT_RULES } from '@template/shared/domain/attachment-catalog.util';
import { SCREENSHOT_MAX_BYTES } from '@template/shared/domain/screenshot-catalog.util';

/**
 * O TETO DE TAMANHO NA PORTA DE ENTRADA do upload.
 *
 * O limite de verdade de cada arquivo é do domínio (o catálogo de anexos, o do print, o da
 * foto): é ele que sabe o formato e devolve a mensagem certa. Só que o domínio confere DEPOIS
 * que o arquivo inteiro já foi lido para a memória — e abrir chamado é uma rota pública. Sem um
 * teto aqui, qualquer pessoa manda um arquivo de gigabytes e derruba o servidor antes de
 * qualquer regra ser consultada.
 *
 * Este teto é o MAIOR arquivo que a rota pode aceitar: nada legítimo esbarra nele, e o que
 * passar dele é cortado no meio do envio, sem ocupar memória.
 *
 * O tamanho TOTAL da requisição (vários arquivos grandes juntos) não tem como ser limitado
 * aqui — esse teto é do proxy que fica na frente do sistema.
 */
export function uploadLimit(maxBytes: number): { limits: { fileSize: number } } {
  return { limits: { fileSize: maxBytes } };
}

/**
 * O maior arquivo que um chamado aceita: o maior teto do catálogo de anexos (o vídeo), ou o do
 * print, o que for maior. Calculado do catálogo para não ficar para trás quando um teto mudar.
 */
export const TICKET_UPLOAD_MAX_BYTES = Math.max(
  SCREENSHOT_MAX_BYTES,
  ...Object.values(ATTACHMENT_RULES).map((rule) => rule.maxBytes),
);
