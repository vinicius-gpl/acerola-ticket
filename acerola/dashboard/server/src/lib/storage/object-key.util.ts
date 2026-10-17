import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import { STAGING_FOLDER } from '@template/shared/schemas/staged-file.schema';

/**
 * Extensões que o navegador executa se forem servidas de volta. O arquivo até pode ser
 * guardado, mas a extensão é descartada do endereço — assim ele nunca é entregue como algo
 * que o navegador trate como código.
 */
const EXECUTABLE_EXTENSIONS = new Set(['.html', '.htm', '.svg', '.xhtml', '.xml', '.js', '.mjs']);

/**
 * Monta o endereço do arquivo dentro do bucket.
 *
 * O nome que o navegador mandou NUNCA vira endereço, e isso é segurança, não capricho: um
 * nome com `../` escaparia da pasta, dois envios com o mesmo nome se sobrescreveriam em
 * silêncio, e o nome do arquivo costuma dizer coisas sobre quem o enviou. O endereço é
 * sorteado aqui; do original sobra só a extensão, para o download sair com o ícone certo.
 *
 * É o mesmo formato de sempre (`pasta/uuid.extensão`): os arquivos gravados antes do envio
 * por link assinado continuam onde estão, e abrem do mesmo jeito.
 */
export function buildObjectKey(folder: string, fileName: string): string {
  const extension = extname(fileName).toLowerCase();
  const safeExtension =
    /^\.[a-z0-9]{1,8}$/.test(extension) && !EXECUTABLE_EXTENSIONS.has(extension) ? extension : '';
  const safeFolder = folder.replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'files';

  return `${safeFolder}/${randomUUID()}${safeExtension}`;
}

/** Chave na área temporária: o arquivo ainda não é de nenhum chamado, produto ou orçamento. */
export function buildStagingKey(fileName: string): string {
  return buildObjectKey(STAGING_FOLDER, fileName);
}
