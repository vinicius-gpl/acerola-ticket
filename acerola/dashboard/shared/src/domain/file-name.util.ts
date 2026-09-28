import { z } from 'zod';

/**
 * O NOME DO ARQUIVO como campo de texto — no mesmo molde do AnyDesk e do telefone: uma regra
 * só, escrita uma vez, usada na API e no formulário.
 *
 * O nome vem do computador de quem envia, e por isso é dado de fora como qualquer outro. Ele
 * NÃO vira endereço no bucket (isso o `buildObjectKey` resolve sorteando um), mas ele volta
 * para a tela e vai no cabeçalho do download — e é aí que um nome torto faz estrago:
 *
 * - `../../outra-pasta/x.pdf` é tentativa de escapar da pasta;
 * - aspas e quebras de linha quebram o cabeçalho `Content-Disposition` do download;
 * - caracteres invisíveis escondem a extensão real;
 * - nome vazio deixa o download sair sem nome nenhum.
 */

export const FILE_NAME_MAX_LENGTH = 180;

/** Separadores de caminho e o que o Windows recusa num nome de arquivo. */
const FORBIDDEN_CHARACTERS = new Set(['/', '\\', '<', '>', ':', '"', '|', '?', '*']);

/**
 * Caracteres que NÃO se veem e que fazem estrago.
 *
 * Escritos por código, e não como faixa dentro de uma expressão regular: um caractere
 * invisível no meio de um padrão é o pior lugar possível para esconder uma regra de
 * segurança — ninguém que leia o código depois consegue dizer o que está ali.
 *
 * - até 31, e 127 a 159: controle, incluindo a quebra de linha que parte o cabeçalho do
 *   download em dois;
 * - 8203 a 8207, e 8234 a 8238: marcas de direção de texto, que escondem a extensão real —
 *   um nome com a marca certa aparece na tela como `nota.exe` lido de trás para a frente.
 */
function isInvisible(code: number): boolean {
  if (code <= 31 || (code >= 127 && code <= 159)) return true;

  return (code >= 8203 && code <= 8207) || (code >= 8234 && code <= 8238);
}

function hasForbidden(value: string): boolean {
  for (const character of value) {
    if (FORBIDDEN_CHARACTERS.has(character)) return true;
    if (isInvisible(character.codePointAt(0) ?? 0)) return true;
  }

  return false;
}

/**
 * Limpa o que dá para limpar antes de julgar.
 *
 * Espaço em volta e ponto no fim são engano comum de quem arrasta o arquivo, não intenção de
 * ninguém: recusar por isso seria trocar um envio que funciona por uma mensagem de erro.
 */
export function cleanFileName(value: string): string {
  return value.trim().replace(/\.+$/, '').trim();
}

export const fileNameSchema = z
  .string({ required_error: 'O arquivo precisa ter um nome' })
  .transform(cleanFileName)
  .pipe(
    z
      .string()
      .min(1, 'O arquivo precisa ter um nome')
      .max(
        FILE_NAME_MAX_LENGTH,
        `O nome do arquivo pode ter até ${FILE_NAME_MAX_LENGTH} caracteres`,
      )
      .refine((value) => !hasForbidden(value), 'O nome do arquivo tem caracteres que não valem')
      /* Um nome que é só pontos (`.`, `..`) é caminho, não arquivo. */
      .refine(
        (value) => value.replace(/\./g, '') !== '',
        'O nome do arquivo tem caracteres que não valem',
      ),
  );

/** A extensão em minúsculas, com o ponto. Vazio quando o nome não tem nenhuma. */
export function extensionOf(fileName: string): string {
  const match = /\.[a-z0-9]{1,8}$/i.exec(cleanFileName(fileName));

  return match ? match[0].toLowerCase() : '';
}
