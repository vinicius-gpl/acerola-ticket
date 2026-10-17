import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import {
  STAGING_FOLDER,
  type StagedFile,
  type UploadTicket,
} from '@template/shared/schemas/staged-file.schema';

import { type FileStorage, UPLOAD_URL_TTL_SECONDS } from './file-storage.type';
import { buildObjectKey, buildStagingKey } from './object-key.util';
import { STORAGE } from './storage.token';

/** O que ficou na área temporária por mais que isto foi abandonado: a pessoa não gravou. */
const STAGING_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const SWEEP_INTERVAL_MS = 60 * 60 * 1000;

/** Uma varredura apaga no máximo isto por lote; 20 lotes = até 10.000 arquivos por rodada. */
export const STAGING_SWEEP_LIMIT = 500;
const MAX_SWEEP_ROUNDS = 20;

/** O tipo de quem não disse o próprio tipo — e que o catálogo resolve pela extensão. */
const UNKNOWN_CONTENT_TYPE = 'application/octet-stream';

/** O arquivo enviado, com o tamanho e o tipo que o STORAGE mediu — não os que a tela declarou. */
export type MeasuredFile = StagedFile & { contentType: string; sizeBytes: number };

/**
 * A ÁREA TEMPORÁRIA — onde o arquivo fica entre o envio pelo navegador e a gravação.
 *
 * Quem decide QUEM PODE enviar é o service de cada feature, antes de chamar
 * `createUploadTicket`. Quem decide O QUE CABE (formato, tamanho, quantidade) também: este
 * serviço só mede (`inspect`), e a regra do domínio julga com o que foi medido.
 *
 * O link aceita o que for enviado por ele — por isso a conferência é sempre do arquivo que
 * está no storage, nunca da promessa feita ao pedir o link.
 */
@Injectable()
export class StagedUploadsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StagedUploadsService.name);
  private sweeper: NodeJS.Timeout | undefined;

  constructor(@Inject(STORAGE) private readonly storage: FileStorage) {}

  onModuleInit(): void {
    this.sweeper = setInterval(() => void this.sweep(new Date()), SWEEP_INTERVAL_MS);
    /* A limpeza não pode segurar o processo vivo num desligamento. */
    this.sweeper.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.sweeper);
  }

  /** Passo 1: a chave na área temporária e o link para o navegador enviar. */
  async createUploadTicket(fileName: string): Promise<UploadTicket> {
    const storageKey = buildStagingKey(fileName);

    return {
      storageKey,
      uploadUrl: await this.storage.uploadUrl(storageKey, UPLOAD_URL_TTL_SECONDS),
      expiresIn: UPLOAD_URL_TTL_SECONDS,
    };
  }

  /**
   * O tamanho e o tipo DE VERDADE do arquivo enviado.
   *
   * Arquivo que não está lá vira 404 com o nome dele: o envio falhou no meio, ou a limpeza já
   * levou — e a pessoa precisa saber qual arquivo enviar de novo. Falha do storage segue como
   * erro nosso (500): dizer "envie de novo" quando quem caiu foi o storage mandaria a pessoa
   * repetir um envio que não vai funcionar.
   */
  async inspect(file: StagedFile): Promise<MeasuredFile> {
    const stored = await this.storage.head(file.storageKey);
    if (!stored) {
      throw new NotFoundException(
        `${file.fileName}: o arquivo não chegou ao armazenamento. Envie de novo.`,
      );
    }

    return {
      ...file,
      contentType: stored.contentType || UNKNOWN_CONTENT_TYPE,
      sizeBytes: stored.size ?? 0,
    };
  }

  /** Passo 3: move da área temporária para a pasta da feature, e devolve a chave definitiva. */
  async promote(file: StagedFile, folder: string): Promise<string> {
    const key = buildObjectKey(folder, file.fileName);
    await this.storage.move(file.storageKey, key);

    return key;
  }

  /**
   * Apaga sem derrubar quem chamou — o arquivo recusado, a cópia que sobrou de uma gravação que
   * falhou. Um objeto órfão no bucket é problema nosso, vai para o log; não é um erro na tela de
   * quem já fez a parte dela.
   */
  async discard(keys: readonly string[]): Promise<void> {
    if (keys.length === 0) return;

    try {
      await this.storage.remove([...keys]);
    } catch (error) {
      this.logger.error(
        `Could not remove ${keys.length} file(s) from the storage: ${keys.join(', ')}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Apaga o que passou do prazo, em lotes, até acabar — ou até o teto de lotes por rodada, para
   * uma área temporária enorme não ocupar o processo por minutos; o resto sai na hora seguinte.
   * Falha aqui vai para o log: ninguém está esperando por ela.
   */
  async sweep(now: Date): Promise<number> {
    const before = new Date(now.getTime() - STAGING_MAX_AGE_MS);
    const progress = { removed: 0 };
    try {
      await this.sweepRounds(before, progress);
    } catch (error) {
      this.logger.error(
        `Could not sweep the upload staging area (removed ${progress.removed} before failing)`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    return progress.removed;
  }

  private async sweepRounds(before: Date, progress: { removed: number }): Promise<void> {
    for (let round = 0; round < MAX_SWEEP_ROUNDS; round += 1) {
      const expired = await this.storage.list(
        `${STAGING_FOLDER}/`,
        STAGING_SWEEP_LIMIT,
        (file) => file.lastModified !== null && file.lastModified < before,
      );
      if (expired.length > 0) await this.storage.remove(expired.map((file) => file.key));
      progress.removed += expired.length;
      if (expired.length < STAGING_SWEEP_LIMIT) return;
    }
  }
}
