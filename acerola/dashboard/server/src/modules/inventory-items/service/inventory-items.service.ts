import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { refuseInventoryPhoto } from '@template/shared/domain/inventory-photo.util';
import {
  type CreateInventoryItemInput,
  type InventoryItem,
  type InventoryItemListQuery,
  type UpdateInventoryItemInput,
} from '@template/shared/schemas/inventory-item.schema';
import { type Paginated } from '@template/shared/schemas/pagination.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type InventoryItemRow } from '../../../lib/db/schema/inventory-items.schema';
import {
  assertCanManageInContext,
  assertCanRead,
} from '../../../lib/policy/policy-assert.util';
import { StorageService } from '../../../lib/storage/storage.service';
import {
  toInventoryItem,
  toInventoryItemInsert,
  toInventoryItemUpdate,
} from '../mapper/inventory-items.mapper';
import { InventoryItemsRepository } from '../repository/inventory-items.repository';
import { optimizePhoto } from './inventory-photo.util';

const ITEM_NOT_FOUND =
  'Produto não encontrado. Ele pode ter sido excluído — recarregue a lista.';

/** A pasta do bucket. Nome em inglês: é infraestrutura, o usuário não vê (CONTRIBUTING §1). */
const PHOTO_FOLDER = 'inventory';

/** A foto como o upload a entrega. */
export type UploadedPhoto = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

/**
 * O ÚNICO caminho de escrita do inventário da Manutenção.
 *
 * Duas regras moram aqui, e as duas são da ÁREA e não do papel geral (#13): quem tem
 * qualquer cargo no sistema CONSULTA o inventário; quem gerencia a Manutenção é que cadastra,
 * altera e exclui. Um gestor de Infraestrutura não mexe na cadeira do escritório, do mesmo
 * jeito que a Manutenção não mexe no parque de máquinas.
 *
 * A foto é tratada aqui, e não no controller: o controller só recebe e entrega. A imagem é
 * recusada pelo domínio, encolhida pelo ffmpeg e guardada no R2 — e a chave dela é o que vai
 * para o banco, nunca o link.
 */
@Injectable()
export class InventoryItemsService {
  constructor(
    private readonly repository: InventoryItemsRepository,
    private readonly storage: StorageService,
  ) {}

  async list(
    user: RequestUser,
    query: InventoryItemListQuery,
  ): Promise<Paginated<InventoryItem>> {
    assertCanRead(user.role, 'o inventário da Manutenção');

    const page = await this.repository.list(query);
    const items = await Promise.all(page.rows.map((row) => this.toItem(row)));

    return { items, total: page.total, page: query.page, pageSize: query.pageSize };
  }

  async findById(user: RequestUser, id: number): Promise<InventoryItem> {
    assertCanRead(user.role, 'o inventário da Manutenção');

    return this.toItem(await this.require(id));
  }

  async create(
    user: RequestUser,
    input: CreateInventoryItemInput,
    photo?: UploadedPhoto,
  ): Promise<InventoryItem> {
    assertCanManageInContext(user, 'manutencao', 'cadastrar produtos');

    const photoKey = await this.storePhoto(photo);
    const row = await this.repository.insert(
      toInventoryItemInsert(input, user.email, photoKey),
    );

    return this.toItem(row);
  }

  /**
   * Alterar o cadastro.
   *
   * A foto antiga só é apagada do bucket DEPOIS que o banco aceitou a troca: na ordem
   * inversa, uma falha na gravação deixaria o produto apontando para um arquivo que não
   * existe mais, e a tela mostraria imagem quebrada.
   */
  async update(
    user: RequestUser,
    id: number,
    input: UpdateInventoryItemInput,
    photo?: UploadedPhoto,
  ): Promise<InventoryItem> {
    assertCanManageInContext(user, 'manutencao', 'alterar produtos');

    const current = await this.require(id);
    const photoKey = photo ? await this.storePhoto(photo) : undefined;

    const row = await this.repository.update(
      id,
      toInventoryItemUpdate(input, user.email, photoKey),
    );
    if (!row) throw new NotFoundException(ITEM_NOT_FOUND);

    await this.discardReplacedPhoto(current.photoKey, row.photoKey);

    return this.toItem(row);
  }

  async remove(user: RequestUser, id: number): Promise<void> {
    assertCanManageInContext(user, 'manutencao', 'excluir produtos');

    const current = await this.require(id);

    await this.repository.remove(id);
    await this.discardReplacedPhoto(current.photoKey, null);
  }

  /** O produto, ou 404 com uma frase que diz o que fazer. */
  private async require(id: number): Promise<InventoryItemRow> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundException(ITEM_NOT_FOUND);

    return row;
  }

  /** A linha do banco com o link temporário da foto, do jeito que a tela precisa. */
  private async toItem(row: InventoryItemRow): Promise<InventoryItem> {
    return toInventoryItem(row, await this.photoUrl(row.photoKey));
  }

  /**
   * O link assinado da foto. Falha de storage NÃO derruba a lista: o produto aparece sem
   * imagem, que é bem melhor do que a tela inteira recusar carregar por causa de uma foto.
   */
  private async photoUrl(key: string | null): Promise<string | null> {
    if (!key) return null;

    try {
      return await this.storage.createDownloadUrl(key, { as: 'inline' });
    } catch {
      return null;
    }
  }

  /**
   * Guarda a foto e devolve a chave dela.
   *
   * A imagem é encolhida antes de subir (ver `inventory-photo.util`). Se o ffmpeg não der
   * conta, sobe o original: perder o cadastro por causa de uma conversão seria trocar um
   * problema pequeno (arquivo maior) por um grande (produto não cadastrado).
   */
  private async storePhoto(photo?: UploadedPhoto): Promise<string | null> {
    if (!photo) return null;

    const refusal = refuseInventoryPhoto({
      contentType: photo.mimetype,
      sizeBytes: photo.size,
    });
    if (refusal) throw new UnprocessableEntityException(refusal.message);

    const optimized = await optimizePhoto(photo.buffer);

    const stored = await this.storage.upload({
      fileName: optimized ? 'foto.webp' : photo.originalname,
      contentType: optimized?.contentType ?? photo.mimetype,
      content: optimized?.content ?? photo.buffer,
      folder: PHOTO_FOLDER,
    });

    return stored.key;
  }

  /**
   * Apaga do bucket a foto que deixou de ser usada.
   *
   * Falha aqui não derruba a operação: o cadastro já está certo no banco, e um arquivo órfão
   * no bucket custa centavos — devolver erro para quem só queria trocar a foto custaria a
   * confiança na tela.
   */
  private async discardReplacedPhoto(
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
