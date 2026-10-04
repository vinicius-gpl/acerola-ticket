/**
 * O NOME DE UM ARQUIVO ENVIADO, com os acentos no lugar.
 *
 * Quem recebe o upload (multer, por baixo o busboy) lê o nome do arquivo como latin1, um byte
 * por letra. O navegador manda em UTF-8, em que "ç" e "ã" ocupam DOIS bytes — e cada byte vira
 * uma letra errada: "Constituição.pdf" chega como "ConstituiÃ§Ã£o.pdf", e é assim que ia para o
 * banco e para a tela.
 *
 * Refazer o caminho (as letras de volta para bytes, os bytes lidos como UTF-8) recupera o nome.
 * Duas travas, para não estragar um nome que já estava certo:
 *
 *  - se alguma letra está fora do latin1 (um nome que já chegou em UTF-8 de verdade, um emoji),
 *    ninguém embaralhou nada: o nome volta como veio;
 *  - se os bytes não formam UTF-8 válido, o nome era latin1 legítimo ("ç" num byte só), e
 *    relê-lo como UTF-8 é que o estragaria: volta como veio também.
 */
const LATIN1_MAX = 0xff;
const REPLACEMENT_CHARACTER = '�';

export function decodeUploadedFileName(name: string): string {
  const isLatin1 = [...name].every((char) => char.charCodeAt(0) <= LATIN1_MAX);
  if (!isLatin1) return name;

  const decoded = Buffer.from(name, 'latin1').toString('utf8');

  return decoded.includes(REPLACEMENT_CHARACTER) ? name : decoded;
}
