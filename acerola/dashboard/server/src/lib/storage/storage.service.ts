import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable } from '@nestjs/common';

import { ENV } from '../config/env.token';
import { type Env } from '../config/env.schema';
import { OBJECT_STORAGE } from './storage.token';

/** O que fica guardado sobre um arquivo. A `key` é o endereço dele dentro do bucket. */
export type StoredFile = {
  key: string;
  contentType: string;
  sizeBytes: number;
};

export type UploadInput = {
  /** O nome que veio do navegador. Usado SÓ para descobrir a extensão — nunca como endereço. */
  fileName: string;
  contentType: string;
  content: Buffer;
  /** A pasta lógica dentro do bucket, por feature: `tarefas`, `contratos`. */
  folder: string;
};

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
 */
export function buildObjectKey(folder: string, fileName: string): string {
  const extension = extname(fileName).toLowerCase();
  const safeExtension =
    /^\.[a-z0-9]{1,8}$/.test(extension) && !EXECUTABLE_EXTENSIONS.has(extension) ? extension : '';
  const safeFolder = folder.replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'arquivos';

  return `${safeFolder}/${randomUUID()}${safeExtension}`;
}

/**
 * Os arquivos do sistema, no Cloudflare R2.
 *
 * O R2 fala o protocolo do S3, então o SDK da AWS serve — o que muda é o endereço do serviço
 * e a região, que no R2 é sempre `auto` porque não existe escolha de região a fazer.
 *
 * O bucket é PRIVADO. Ninguém baixa um arquivo por endereço fixo: quem precisa de um pede um
 * link assinado, que vale por poucos minutos (ver `R2_SIGNED_URL_TTL_SECONDS`). Bucket
 * público seria mais simples e transformaria qualquer endereço vazado em acesso permanente.
 */
@Injectable()
export class StorageService {
  constructor(
    @Inject(OBJECT_STORAGE) private readonly client: S3Client,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async upload(input: UploadInput): Promise<StoredFile> {
    const key = buildObjectKey(input.folder, input.fileName);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.env.R2_BUCKET,
        Key: key,
        Body: input.content,
        ContentType: input.contentType,
      }),
    );

    return { key, contentType: input.contentType, sizeBytes: input.content.byteLength };
  }

  /**
   * Um link temporário para o navegador baixar o arquivo direto do R2.
   *
   * O arquivo não passa pela API: fazer o Nest baixar do R2 e repassar dobraria o tráfego e
   * prenderia um processo do server por download.
   */
  createDownloadUrl(key: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.env.R2_BUCKET, Key: key }),
      { expiresIn: this.env.R2_SIGNED_URL_TTL_SECONDS },
    );
  }

  async remove(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.env.R2_BUCKET, Key: key }),
    );
  }
}
