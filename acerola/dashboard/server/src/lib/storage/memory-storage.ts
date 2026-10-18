import { type FileStorage, type StoredFile } from './file-storage.type';

type MemoryFile = { content: Buffer; contentType: string | null; lastModified: Date };

/**
 * Storage em memória, para os testes: o mesmo contrato do S3, sem rede. Some quando o processo
 * termina.
 *
 * As URLs assinadas são de mentira (`memory://`): servem para o teste conferir QUAL arquivo e
 * com QUAL nome a URL abriria, não para serem abertas.
 */
export class MemoryStorage implements FileStorage {
  private readonly files = new Map<string, MemoryFile>();

  async uploadUrl(key: string, expiresIn: number): Promise<string> {
    return `memory://upload/${key}?expires=${expiresIn}`;
  }

  async downloadUrl(key: string, expiresIn: number, downloadAs: string | null): Promise<string> {
    const name = downloadAs ? `&download=${encodeURIComponent(downloadAs)}` : '';

    return `memory://download/${key}?expires=${expiresIn}${name}`;
  }

  /** Também é o que o navegador faria com a URL de envio — para o teste pôr um arquivo no storage. */
  async put(
    key: string,
    content: Buffer,
    contentType: string | null,
    lastModified = new Date(),
  ): Promise<void> {
    this.files.set(key, { content: Buffer.from(content), contentType, lastModified });
  }

  async get(key: string): Promise<{ content: Buffer; contentType: string | null } | null> {
    const file = this.files.get(key);

    return file ? { content: file.content, contentType: file.contentType } : null;
  }

  async head(key: string): Promise<{ size: number | null; contentType: string | null } | null> {
    const file = this.files.get(key);

    return file ? { size: file.content.length, contentType: file.contentType } : null;
  }

  async move(from: string, to: string): Promise<void> {
    const file = this.files.get(from);
    if (!file) throw new Error(`Memory storage has no ${from}`);

    this.files.set(to, file);
    this.files.delete(from);
  }

  async list(
    prefix: string,
    limit: number,
    keep: (file: StoredFile) => boolean,
  ): Promise<StoredFile[]> {
    return [...this.files.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, file]) => ({ key, lastModified: file.lastModified }))
      .filter(keep)
      .slice(0, limit);
  }

  async remove(keys: string[]): Promise<void> {
    for (const key of keys) this.files.delete(key);
  }

  /** Quantos arquivos guardados — para o teste conferir que nada ficou para trás. */
  get size(): number {
    return this.files.size;
  }
}
