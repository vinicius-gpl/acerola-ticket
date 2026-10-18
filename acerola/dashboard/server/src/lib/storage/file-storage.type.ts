/** Um arquivo encontrado numa listagem: a chave e quando foi gravado. */
export type StoredFile = { key: string; lastModified: Date | null };

/**
 * Vida curta de propósito: link assinado é acesso ao arquivo para quem o tiver, sem passar
 * pela identidade.
 *
 * O de download é o teto (5 min), e não 2: a fila e o detalhe do chamado entregam o link pronto
 * na resposta, e a pessoa clica minutos depois de a tela carregar.
 */
export const UPLOAD_URL_TTL_SECONDS = 300;
export const DOWNLOAD_URL_TTL_SECONDS = 300;

/**
 * O que o sistema precisa de um storage de arquivos — e nada além.
 *
 * Os services falam com ESTE contrato, nunca com o SDK do provedor: trocar o R2 por AWS ou
 * MinIO é trocar o `StorageModule`, e os testes trocam a implementação por uma em memória.
 *
 * O arquivo de quem usa o sistema NÃO passa pela API: o navegador envia e abre direto no
 * storage, por URL assinada de vida curta. Um vídeo de 50 MB ocuparia o processo do Nest
 * durante o envio inteiro.
 */
export type FileStorage = {
  /** URL assinada para o navegador ENVIAR o arquivo (PUT). Quem confere tamanho e tipo é a confirmação. */
  uploadUrl(key: string, expiresIn: number): Promise<string>;
  /** URL assinada para ABRIR; com `downloadAs`, o navegador salva com esse nome em vez de abrir. */
  downloadUrl(key: string, expiresIn: number, downloadAs: string | null): Promise<string>;
  /** O conteúdo e o tipo do arquivo, ou `null` quando a chave não existe. */
  get(key: string): Promise<{ content: Buffer; contentType: string | null } | null>;
  /**
   * Grava pelo servidor. Só para o que o SERVIDOR produz a partir de um arquivo que já está no
   * storage (a foto do inventário encolhida) — o arquivo de quem usa chega por `uploadUrl`.
   */
  put(key: string, content: Buffer, contentType: string | null): Promise<void>;
  /** O tamanho e o tipo que o storage MEDIU, ou `null` quando a chave não existe. */
  head(key: string): Promise<{ size: number | null; contentType: string | null } | null>;
  /** Move dentro do storage, sem o arquivo sair de lá. */
  move(from: string, to: string): Promise<void>;
  /** Os arquivos debaixo do prefixo que passam em `keep`, no máximo `limit`. */
  list(prefix: string, limit: number, keep: (file: StoredFile) => boolean): Promise<StoredFile[]>;
  /** Apaga as chaves. Chave que já não existe não é erro: o resultado pedido já está lá. */
  remove(keys: string[]): Promise<void>;
};
