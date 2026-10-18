import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { type FileStorage, type StoredFile } from './file-storage.type';

export type S3StorageOptions = {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

/** O S3 apaga no máximo mil chaves por pedido. */
const DELETE_BATCH = 1000;

/**
 * O storage pelo protocolo S3 — hoje o Cloudflare R2 (ver `StorageModule`).
 *
 * O arquivo vai do navegador direto para o storage, por URL assinada; a API só emite a URL e
 * faz o que é do servidor (conferir, mover da área temporária, apagar). O controle de quem mexe
 * em qual chamado, produto ou orçamento continua no service, antes de chegar aqui.
 */
export class S3Storage implements FileStorage {
  private readonly client: S3Client;

  constructor(private readonly options: S3StorageOptions) {
    this.client = new S3Client({
      region: options.region,
      endpoint: options.endpoint,
      forcePathStyle: options.forcePathStyle,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
    });
  }

  async uploadUrl(key: string, expiresIn: number): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.options.bucket, Key: key }),
      { expiresIn },
    );
  }

  async downloadUrl(key: string, expiresIn: number, downloadAs: string | null): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.options.bucket,
      Key: key,
      ...(downloadAs ? { ResponseContentDisposition: attachmentDisposition(downloadAs) } : {}),
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async get(key: string): Promise<{ content: Buffer; contentType: string | null } | null> {
    try {
      const object = await this.client.send(
        new GetObjectCommand({ Bucket: this.options.bucket, Key: key }),
      );
      if (!object.Body) return null;

      return {
        content: Buffer.from(await object.Body.transformToByteArray()),
        contentType: object.ContentType ?? null,
      };
    } catch (error) {
      /* Arquivo que não existe é resposta legítima ("não achei"), não falha do storage. */
      if (error instanceof NoSuchKey) return null;
      throw error;
    }
  }

  async put(key: string, content: Buffer, contentType: string | null): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
        Body: content,
        ContentType: contentType ?? undefined,
      }),
    );
  }

  async head(key: string): Promise<{ size: number | null; contentType: string | null } | null> {
    try {
      const object = await this.client.send(
        new HeadObjectCommand({ Bucket: this.options.bucket, Key: key }),
      );

      return { size: object.ContentLength ?? null, contentType: object.ContentType ?? null };
    } catch (error) {
      /* O HEAD não tem corpo para dizer `NoSuchKey`: o "não achei" dele é `NotFound`. */
      if (error instanceof NotFound) return null;
      throw error;
    }
  }

  /** O S3 não tem "mover": é copiar dentro do storage e apagar a origem. */
  async move(from: string, to: string): Promise<void> {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.options.bucket,
        Key: to,
        CopySource: copySource(this.options.bucket, from),
      }),
    );
    await this.remove([from]);
  }

  /**
   * O S3 lista em ordem de NOME, não de data — por isso o filtro vem de quem chama, página a
   * página, até juntar `limit` arquivos.
   */
  async list(
    prefix: string,
    limit: number,
    keep: (file: StoredFile) => boolean,
  ): Promise<StoredFile[]> {
    const found: StoredFile[] = [];
    let token: string | undefined;

    do {
      const page = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.options.bucket,
          Prefix: prefix,
          ContinuationToken: token,
        }),
      );
      const files = (page.Contents ?? []).flatMap((object) =>
        object.Key ? [{ key: object.Key, lastModified: object.LastModified ?? null }] : [],
      );
      found.push(...files.filter(keep));
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token && found.length < limit);

    return found.slice(0, limit);
  }

  async remove(keys: string[]): Promise<void> {
    for (let start = 0; start < keys.length; start += DELETE_BATCH) {
      const batch = keys.slice(start, start + DELETE_BATCH);
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.options.bucket,
          Delete: { Objects: batch.map((key) => ({ Key: key })), Quiet: true },
        }),
      );
    }
  }
}

/**
 * O nome que o navegador usa ao SALVAR. `filename*` leva o nome com acento (RFC 5987), e
 * `filename` leva uma versão sem acento para quem não entende o primeiro.
 */
export function attachmentDisposition(name: string): string {
  const ascii = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]|["\\]/g, '_');

  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/** A origem da cópia vai codificada, como o S3 pede — as chaves têm espaço e parênteses. */
function copySource(bucket: string, key: string): string {
  return `${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
}
