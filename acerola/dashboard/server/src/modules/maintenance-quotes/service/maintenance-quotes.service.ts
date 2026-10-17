import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { refuseQuoteAttachment } from '@template/shared/domain/maintenance-quote.util';
import {
  type CreateMaintenanceQuoteInput,
  type MaintenanceQuote,
  type MaintenanceQuoteListQuery,
  type UpdateMaintenanceQuoteInput,
} from '@template/shared/schemas/maintenance-quote.schema';
import { type Paginated } from '@template/shared/schemas/pagination.schema';
import {
  type StagedFile,
  type UploadRequest,
  type UploadTicket,
} from '@template/shared/schemas/staged-file.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type MaintenanceQuoteRow } from '../../../lib/db/schema/maintenance-quotes.schema';
import { assertCanManageInContext, assertCanRead } from '../../../lib/policy/policy-assert.util';
import { DOWNLOAD_URL_TTL_SECONDS, type FileStorage } from '../../../lib/storage/file-storage.type';
import { StagedUploadsService } from '../../../lib/storage/staged-uploads.service';
import { STORAGE } from '../../../lib/storage/storage.token';
import {
  type StoredAttachment,
  toMaintenanceQuote,
  toMaintenanceQuoteInsert,
  toMaintenanceQuoteUpdate,
} from '../mapper/maintenance-quotes.mapper';
import { MaintenanceQuotesRepository } from '../repository/maintenance-quotes.repository';

const QUOTE_NOT_FOUND =
  'Orçamento não encontrado. Ele pode ter sido excluído — recarregue a lista.';

/** A pasta do bucket. Nome em inglês: é infraestrutura, o usuário não vê (CONTRIBUTING §1). */
const ATTACHMENT_FOLDER = 'maintenance-quotes';

/**
 * O ÚNICO caminho de escrita dos orçamentos da Manutenção.
 *
 * A mesma régua do inventário, e pela mesma razão (#13): quem tem qualquer cargo no sistema
 * CONSULTA; quem gerencia a Manutenção é que guarda, altera e exclui. Orçamento é dinheiro da
 * área — a decisão sobre ele é de quem responde por ela.
 *
 * O documento vai do navegador direto para o R2, por link assinado. Aqui ele é conferido
 * pelo domínio (com o que o storage mediu) e movido para o lugar definitivo do jeito que chegou
 * (PDF não se "reduz"); a chave dele é o que vai para o banco.
 */
@Injectable()
export class MaintenanceQuotesService {
  constructor(
    private readonly repository: MaintenanceQuotesRepository,
    private readonly staging: StagedUploadsService,
    @Inject(STORAGE) private readonly storage: FileStorage,
  ) {}

  /**
   * O link para enviar o documento de um orçamento. Só quem guarda orçamentos recebe — e o que
   * nem é PDF ou imagem é recusado antes de ser enviado.
   */
  async createAttachmentUploadTicket(
    user: RequestUser,
    input: UploadRequest,
  ): Promise<UploadTicket> {
    assertCanManageInContext(user, 'manutencao', 'enviar documentos de orçamentos');

    const refusal = refuseQuoteAttachment(input);
    if (refusal) throw new UnprocessableEntityException(refusal.message);

    return this.staging.createUploadTicket(input.fileName);
  }

  async list(
    user: RequestUser,
    query: MaintenanceQuoteListQuery,
  ): Promise<Paginated<MaintenanceQuote>> {
    assertCanRead(user.role, 'os orçamentos da Manutenção');

    const page = await this.repository.list(query);
    const items = await Promise.all(page.rows.map((row) => this.toQuote(row)));

    return { items, total: page.total, page: query.page, pageSize: query.pageSize };
  }

  async findById(user: RequestUser, id: number): Promise<MaintenanceQuote> {
    assertCanRead(user.role, 'os orçamentos da Manutenção');

    return this.toQuote(await this.require(id));
  }

  async create(user: RequestUser, input: CreateMaintenanceQuoteInput): Promise<MaintenanceQuote> {
    assertCanManageInContext(user, 'manutencao', 'guardar orçamentos');

    const stored = await this.storeAttachment(input.attachment);
    const row = await this.repository.insert(toMaintenanceQuoteInsert(input, user.email, stored));

    return this.toQuote(row);
  }

  /**
   * Alterar o orçamento.
   *
   * O documento antigo só é apagado do bucket DEPOIS que o banco aceitou a troca: na ordem
   * inversa, uma falha na gravação deixaria o orçamento apontando para um arquivo que não
   * existe mais.
   */
  async update(
    user: RequestUser,
    id: number,
    input: UpdateMaintenanceQuoteInput,
  ): Promise<MaintenanceQuote> {
    assertCanManageInContext(user, 'manutencao', 'alterar orçamentos');

    const current = await this.require(id);
    const stored = (await this.storeAttachment(input.attachment)) ?? undefined;

    const row = await this.repository.update(
      id,
      toMaintenanceQuoteUpdate(input, user.email, current, stored),
    );
    if (!row) throw new NotFoundException(QUOTE_NOT_FOUND);

    await this.discardReplacedAttachment(current.attachmentKey, row.attachmentKey);

    return this.toQuote(row);
  }

  async remove(user: RequestUser, id: number): Promise<void> {
    assertCanManageInContext(user, 'manutencao', 'excluir orçamentos');

    const current = await this.require(id);

    await this.repository.remove(id);
    await this.discardReplacedAttachment(current.attachmentKey, null);
  }

  /** O orçamento, ou 404 com uma frase que diz o que fazer. */
  private async require(id: number): Promise<MaintenanceQuoteRow> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundException(QUOTE_NOT_FOUND);

    return row;
  }

  /** A linha do banco com o link temporário do documento, do jeito que a tela precisa. */
  private async toQuote(row: MaintenanceQuoteRow): Promise<MaintenanceQuote> {
    return toMaintenanceQuote(row, await this.attachmentUrl(row));
  }

  /**
   * O link assinado do documento. Falha de storage NÃO derruba a lista: o orçamento aparece
   * sem o arquivo, que é bem melhor do que a tela inteira recusar carregar.
   */
  private async attachmentUrl(row: MaintenanceQuoteRow): Promise<string | null> {
    if (!row.attachmentKey) return null;

    try {
      return await this.storage.downloadUrl(row.attachmentKey, DOWNLOAD_URL_TTL_SECONDS, null);
    } catch {
      return null;
    }
  }

  /**
   * Tira o documento da área temporária e devolve a chave e o nome dele — ou nulo, quando não
   * veio nenhum. Confere o arquivo que o storage MEDIU; o que não serve sai da área temporária,
   * com o motivo.
   */
  private async storeAttachment(attachment?: StagedFile): Promise<StoredAttachment | null> {
    if (!attachment) return null;

    const measured = await this.staging.inspect(attachment);
    const refusal = refuseQuoteAttachment(measured);
    if (refusal) {
      await this.staging.discard([attachment.storageKey]);
      throw new UnprocessableEntityException(refusal.message);
    }

    const key = await this.staging.promote(attachment, ATTACHMENT_FOLDER);

    return { key, name: attachment.fileName };
  }

  /**
   * Apaga do bucket o documento que deixou de ser usado.
   *
   * Falha aqui não derruba a operação: o orçamento já está certo no banco, e um arquivo órfão
   * no bucket custa centavos — devolver erro a quem só trocou o documento custaria a
   * confiança na tela.
   */
  private async discardReplacedAttachment(
    previousKey: string | null,
    currentKey: string | null,
  ): Promise<void> {
    if (!previousKey) return;
    if (previousKey === currentKey) return;

    try {
      await this.storage.remove([previousKey]);
    } catch {
      // segue adiante: o banco já tem a verdade.
    }
  }
}
