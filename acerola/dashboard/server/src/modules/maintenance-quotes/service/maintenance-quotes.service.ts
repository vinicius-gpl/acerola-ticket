import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { refuseQuoteAttachment } from '@template/shared/domain/maintenance-quote.util';
import {
  type CreateMaintenanceQuoteInput,
  type MaintenanceQuote,
  type MaintenanceQuoteListQuery,
  type UpdateMaintenanceQuoteInput,
} from '@template/shared/schemas/maintenance-quote.schema';
import { type Paginated } from '@template/shared/schemas/pagination.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type MaintenanceQuoteRow } from '../../../lib/db/schema/maintenance-quotes.schema';
import { assertCanManageInContext, assertCanRead } from '../../../lib/policy/policy-assert.util';
import { StorageService } from '../../../lib/storage/storage.service';
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

/** O documento como o upload o entrega. */
export type UploadedAttachment = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

/**
 * O ÚNICO caminho de escrita dos orçamentos da Manutenção.
 *
 * A mesma régua do inventário, e pela mesma razão (#13): quem tem qualquer cargo no sistema
 * CONSULTA; quem gerencia a Manutenção é que guarda, altera e exclui. Orçamento é dinheiro da
 * área — a decisão sobre ele é de quem responde por ela.
 *
 * O documento é tratado aqui, e não no controller: ele é recusado pelo domínio e guardado no
 * R2 do jeito que chegou (PDF não se "reduz"), e a chave dele é o que vai para o banco.
 */
@Injectable()
export class MaintenanceQuotesService {
  constructor(
    private readonly repository: MaintenanceQuotesRepository,
    private readonly storage: StorageService,
  ) {}

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

  async create(
    user: RequestUser,
    input: CreateMaintenanceQuoteInput,
    attachment?: UploadedAttachment,
  ): Promise<MaintenanceQuote> {
    assertCanManageInContext(user, 'manutencao', 'guardar orçamentos');

    const stored = await this.storeAttachment(attachment);
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
    attachment?: UploadedAttachment,
  ): Promise<MaintenanceQuote> {
    assertCanManageInContext(user, 'manutencao', 'alterar orçamentos');

    const current = await this.require(id);
    const stored = (await this.storeAttachment(attachment)) ?? undefined;

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
      return await this.storage.createDownloadUrl(row.attachmentKey, {
        as: 'inline',
        fileName: row.attachmentName ?? undefined,
      });
    } catch {
      return null;
    }
  }

  /** Guarda o documento e devolve a chave e o nome dele — ou nulo, quando não veio nenhum. */
  private async storeAttachment(attachment?: UploadedAttachment): Promise<StoredAttachment | null> {
    if (!attachment) return null;

    const refusal = refuseQuoteAttachment({
      contentType: attachment.mimetype,
      sizeBytes: attachment.size,
    });
    if (refusal) throw new UnprocessableEntityException(refusal.message);

    const stored = await this.storage.upload({
      fileName: attachment.originalname,
      contentType: attachment.mimetype,
      content: attachment.buffer,
      folder: ATTACHMENT_FOLDER,
    });

    return { key: stored.key, name: attachment.originalname };
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
      await this.storage.remove(previousKey);
    } catch {
      // segue adiante: o banco já tem a verdade.
    }
  }
}
