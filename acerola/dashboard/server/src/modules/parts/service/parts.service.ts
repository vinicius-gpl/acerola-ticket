import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { balanceAfter, fitsInStock } from '@template/shared/domain/part-catalog.util';
import { type Paginated } from '@template/shared/schemas/pagination.schema';
import {
  type CreateMovementInput,
  type CreatePartInput,
  type MovementListQuery,
  type Part,
  type PartListQuery,
  type PartMovement,
  type UpdateMovementInput,
  type UpdatePartInput,
} from '@template/shared/schemas/part.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type DatabaseExecutor } from '../../../lib/db/db.type';
import { type PartRow } from '../../../lib/db/schema/parts.schema';
import {
  assertCanCreate,
  assertCanModifyRecord,
  assertCanRead,
} from '../../../lib/policy/policy-assert.util';
import {
  toMovement,
  toMovementUpdate,
  toPart,
  toPartInsert,
  toPartUpdate,
} from '../mapper/parts.mapper';
import { PartsRepository } from '../repository/parts.repository';

const PART_NOT_FOUND = 'Peça não encontrada. Ela pode ter sido excluída — recarregue a lista.';

const MOVEMENT_NOT_FOUND =
  'Movimentação não encontrada. Ela pode ter sido excluída — recarregue a lista.';

/**
 * O ÚNICO caminho de escrita do depósito.
 *
 * A regra central está toda aqui: **o saldo de uma peça é o resultado do extrato dela**. No
 * sistema antigo essa conta vivia num gatilho do banco, onde ninguém a lia junto com o resto
 * do código e não havia como testá-la sem um banco de pé.
 *
 * Toda movimentação acontece DENTRO de uma transação, com a peça travada: a linha do extrato
 * e o saldo entram juntos ou não entram, e duas pessoas movimentando a mesma peça ao mesmo
 * tempo não conseguem ler o mesmo saldo antigo.
 */
@Injectable()
export class PartsService {
  constructor(private readonly repository: PartsRepository) {}

  async list(user: RequestUser, query: PartListQuery): Promise<Paginated<Part>> {
    assertCanRead(user.role, 'o depósito');

    const page = await this.repository.list(query);

    return {
      items: page.rows.map(toPart),
      total: page.total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findById(user: RequestUser, id: number): Promise<Part> {
    assertCanRead(user.role, 'o depósito');

    return toPart(await this.requirePart(id));
  }

  /**
   * Cadastra a peça e, se veio quantidade, já registra a primeira ENTRADA.
   *
   * As duas coisas na mesma transação: uma peça que nasce com saldo mas sem a linha que o
   * explica é exatamente o número que ninguém consegue conferir depois.
   */
  async create(user: RequestUser, input: CreatePartInput): Promise<Part> {
    assertCanCreate(user.role, 'peças no depósito');

    const quantity = Number(input.initialQuantity ?? 0);

    return this.repository.transaction(async (executor) => {
      const created = await this.repository.insert(toPartInsert(input, user.email), executor);
      if (!quantity) return toPart(created);

      await this.repository.insertMovement(
        {
          partId: created.id,
          type: 'in',
          quantity,
          balanceAfter: quantity,
          handledBy: null,
          note: 'Quantidade informada no cadastro da peça.',
          createdBy: user.email,
        },
        executor,
      );

      return toPart(await this.repository.update(created.id, { balance: quantity }, executor));
    });
  }

  async update(user: RequestUser, id: number, input: UpdatePartInput): Promise<Part> {
    assertCanRead(user.role, 'o depósito');

    const current = await this.requirePart(id);
    assertCanModifyRecord(user.role, user.email, current.createdBy, 'Esta peça');

    return toPart(await this.repository.update(id, toPartUpdate(input, user.email)));
  }

  async movements(
    user: RequestUser,
    query: MovementListQuery,
  ): Promise<Paginated<PartMovement>> {
    assertCanRead(user.role, 'o depósito');

    const page = await this.repository.listMovements(query);

    return {
      items: page.rows.map(toMovement),
      total: page.total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /**
   * Registra uma entrada ou uma saída e move o saldo junto.
   *
   * A saída é conferida contra o que existe na prateleira. O sistema antigo prendia o saldo
   * em zero e seguia em frente: tirar 5 de um estoque de 2 deixava zero, sem avisar ninguém,
   * e a diferença só aparecia quando alguém ia buscar a peça e não achava.
   */
  async createMovement(
    user: RequestUser,
    partId: number,
    input: CreateMovementInput,
  ): Promise<PartMovement> {
    assertCanCreate(user.role, 'movimentações no depósito');

    const quantity = Number(input.quantity);

    const movementId = await this.repository.transaction(async (executor) => {
      const part = await this.repository.findByIdForUpdate(partId, executor);
      if (!part) throw new NotFoundException(PART_NOT_FOUND);

      if (!fitsInStock(part.balance, input.type, quantity)) {
        throw new UnprocessableEntityException(stockMessage(part, quantity));
      }

      const balance = balanceAfter(part.balance, input.type, quantity);

      const id = await this.repository.insertMovement(
        {
          partId,
          type: input.type,
          quantity,
          balanceAfter: balance,
          computerId: input.computerId ?? null,
          handledBy: input.handledBy ?? null,
          note: input.note ?? null,
          createdBy: user.email,
        },
        executor,
      );

      await this.repository.update(partId, { balance }, executor);

      return id;
    });

    return toMovement(await this.requireMovement(movementId));
  }

  /** Corrige quem pegou e a observação. Quantidade e tipo não se corrigem — ver o contrato. */
  async updateMovement(
    user: RequestUser,
    id: number,
    input: UpdateMovementInput,
  ): Promise<PartMovement> {
    assertCanRead(user.role, 'o depósito');

    const current = await this.requireMovement(id);
    assertCanModifyRecord(
      user.role,
      user.email,
      current.movement.createdBy,
      'Esta movimentação',
    );

    await this.repository.updateMovement(id, toMovementUpdate(input, user.email));

    return toMovement(await this.requireMovement(id));
  }

  /**
   * Exclui uma movimentação lançada errada e DESFAZ o efeito dela no saldo.
   *
   * O extrato inteiro da peça é refeito depois: as linhas seguintes tinham no `balanceAfter`
   * um saldo que contava com a linha excluída, e deixá-las como estavam faria o extrato
   * mostrar uma sequência que não fecha — o tipo de detalhe que destrói a confiança no
   * número todo.
   */
  async removeMovement(user: RequestUser, id: number): Promise<void> {
    assertCanRead(user.role, 'o depósito');

    const current = await this.requireMovement(id);
    assertCanModifyRecord(
      user.role,
      user.email,
      current.movement.createdBy,
      'Esta movimentação',
    );

    const partId = current.movement.partId;

    await this.repository.transaction(async (executor) => {
      await this.repository.findByIdForUpdate(partId, executor);
      await this.repository.deleteMovement(id, executor);
      await this.recalculate(partId, executor);
    });
  }

  /** Refaz o extrato de uma peça do zero e grava o saldo final. */
  private async recalculate(partId: number, executor: DatabaseExecutor): Promise<void> {
    const movements = await this.repository.listMovementsOfPart(partId, executor);

    let balance = 0;

    for (const movement of movements) {
      balance = balanceAfter(balance, movement.type, movement.quantity);

      /* Só grava a linha que mudou: reescrever o extrato inteiro a cada exclusão encheria o
         histórico de alterações que não alteraram nada. */
      if (movement.balanceAfter !== balance) {
        await this.repository.updateMovement(movement.id, { balanceAfter: balance }, executor);
      }
    }

    await this.repository.update(partId, { balance }, executor);
  }

  private async requirePart(id: number): Promise<PartRow> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundException(PART_NOT_FOUND);

    return row;
  }

  private async requireMovement(id: number) {
    const row = await this.repository.findMovementById(id);
    if (!row) throw new NotFoundException(MOVEMENT_NOT_FOUND);

    return row;
  }
}

/**
 * A recusa diz o número, não só "não dá".
 *
 * Quem lê precisa saber se faltou uma ou faltaram dez para decidir o que fazer: registrar a
 * entrada que alguém esqueceu, ou procurar a peça em outro lugar.
 */
function stockMessage(part: PartRow, quantity: number): string {
  if (part.balance === 0) {
    return `Não há ${part.name} no depósito. Registre uma entrada antes de dar saída.`;
  }

  return `Só há ${part.balance} de ${part.name} no depósito, e a saída é de ${quantity}. Confira a prateleira e registre a entrada que faltou.`;
}
