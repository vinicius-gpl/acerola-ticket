import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { balanceAfter } from '@template/shared/domain/part-catalog.util';
import { isRealTransfer, reserveDisplayNameOf } from '@template/shared/domain/transfer.util';
import {
  type CreateTransferInput,
  type InstalledPart,
  type Transfer,
  type TransferPeripheralInput,
} from '@template/shared/schemas/transfer.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type DatabaseExecutor } from '../../../lib/db/db.type';
import { type ComputerRow } from '../../../lib/db/schema/computers.schema';
import { assertCanCreate, assertCanRead } from '../../../lib/policy/policy-assert.util';
import { PartsRepository } from '../../parts/repository/parts.repository';
import { toInstalledPart, toTransfer } from '../mapper/transfers.mapper';
import { TransfersRepository } from '../repository/transfers.repository';

const COMPUTER_NOT_FOUND =
  'Máquina não encontrada. Ela pode ter sido excluída — recarregue a lista.';

const SAME_DEPARTMENT = 'A máquina já está nesse departamento. Escolha um destino diferente.';

const OUT_OF_USE =
  'Esta máquina está fora de uso (arquivada ou descartada). Tire-a do arquivo antes de transferir.';

/**
 * A TRANSFERÊNCIA de uma máquina, com tudo o que ela arrasta junto.
 *
 * Tudo acontece numa transação só, com a máquina travada: a linha do histórico, o
 * departamento novo e o destino de cada periférico entram juntos ou não entram. Metade disso
 * aplicado é o pior resultado possível — a máquina aparece no setor novo e o teclado continua
 * contado na mesa antiga.
 *
 * **O que esta versão NÃO faz, e o sistema antigo fazia:** copiar o departamento novo para os
 * registros de manutenção da máquina. Aqui a manutenção aponta para a máquina, e o
 * departamento é lido dela na hora — não existe cópia para sair do lugar.
 */
@Injectable()
export class TransfersService {
  constructor(
    private readonly repository: TransfersRepository,
    private readonly parts: PartsRepository,
  ) {}

  async listByComputer(user: RequestUser, computerId: number): Promise<Transfer[]> {
    assertCanRead(user.role, 'o histórico da máquina');

    const rows = await this.repository.listByComputer(computerId);

    return rows.map(toTransfer);
  }

  /** O que está na máquina hoje — é a lista que o formulário usa para perguntar o destino. */
  async installedParts(user: RequestUser, computerId: number): Promise<InstalledPart[]> {
    assertCanRead(user.role, 'as peças da máquina');

    const rows = await this.repository.installedParts(computerId);

    return rows.map(toInstalledPart);
  }

  async create(
    user: RequestUser,
    computerId: number,
    input: CreateTransferInput,
  ): Promise<Transfer> {
    assertCanCreate(user.role, 'transferências de máquina');

    const toDepartment = input.toDepartment ?? null;
    const leftBehind = (input.peripherals ?? []).filter(
      (peripheral) => peripheral.destiny === 'station',
    ) as TransferPeripheralInput[];

    return this.repository.transaction(async (executor) => {
      const computer = await this.requireComputerForUpdate(computerId, executor);

      if (!isRealTransfer(computer.department, toDepartment)) {
        throw new UnprocessableEntityException(SAME_DEPARTMENT);
      }

      for (const peripheral of leftBehind) {
        await this.leaveBehind(peripheral, computer, user.email, executor);
      }

      const row = await this.repository.insert(
        {
          computerId,
          fromDepartment: computer.department,
          toDepartment,
          responsible: input.responsible?.trim() || null,
          note: input.note?.trim() || null,
          peripheralsLeftBehind: leftBehind.length,
          createdBy: user.email,
        },
        executor,
      );

      await this.repository.updateComputer(computerId, movedValues(computer, toDepartment), executor);

      return toTransfer(row);
    });
  }

  private async requireComputerForUpdate(
    id: number,
    executor: DatabaseExecutor,
  ): Promise<ComputerRow> {
    const computer = await this.repository.findComputerForUpdate(id, executor);
    if (!computer) throw new NotFoundException(COMPUTER_NOT_FOUND);

    /* Transferir uma máquina fora de uso põe no histórico uma mudança que não existiu no
       mundo real: ela não está na mesa de ninguém para mudar de sala. */
    if (computer.isArchived || computer.disposedAt) {
      throw new UnprocessableEntityException(OUT_OF_USE);
    }

    return computer;
  }

  /**
   * O periférico que FICA: volta ao depósito e sai de novo para a máquina que assume.
   *
   * São DUAS linhas no extrato, e não uma correção silenciosa do dono da peça: o saldo da
   * prateleira termina igual ao que era, e o extrato conta a história inteira — saiu daquela
   * máquina, entrou nesta. Quem for conferir a peça daqui a um ano lê as duas linhas.
   */
  private async leaveBehind(
    peripheral: TransferPeripheralInput,
    from: ComputerRow,
    author: string,
    executor: DatabaseExecutor,
  ): Promise<void> {
    const destinationId = peripheral.destinationComputerId ?? null;
    if (!destinationId) throw new UnprocessableEntityException(destinationMissing(peripheral));

    const destination = await this.requireComputerForUpdate(destinationId, executor);
    const part = await this.parts.findByIdForUpdate(peripheral.partId, executor);
    if (!part) throw new NotFoundException(partMissing(peripheral));

    const quantity = Number(peripheral.quantity);
    const leavingName = from.displayName?.trim() || from.name;
    const returned = balanceAfter(part.balance, 'in', quantity);

    await this.parts.insertMovement(
      {
        partId: part.id,
        type: 'in',
        quantity,
        balanceAfter: returned,
        computerId: from.id,
        handledBy: null,
        note: `Ficou na estação — a máquina ${leavingName} saiu.`,
        createdBy: author,
      },
      executor,
    );

    const handed = balanceAfter(returned, 'out', quantity);

    await this.parts.insertMovement(
      {
        partId: part.id,
        type: 'out',
        quantity,
        balanceAfter: handed,
        computerId: destination.id,
        handledBy: null,
        note: `Veio da máquina ${leavingName}.`,
        createdBy: author,
      },
      executor,
    );

    await this.parts.update(part.id, { balance: handed }, executor);
  }
}

/**
 * O que muda na ficha da máquina.
 *
 * Ir para a prateleira ("sem departamento") tira também o responsável e o apelido: os dois
 * são do antigo dono, e mantê-los faria a máquina aparecer no inventário com o nome de quem
 * não a usa mais. Ir para outro setor mexe só no setor.
 */
function movedValues(computer: ComputerRow, toDepartment: string | null) {
  if (toDepartment) return { department: toDepartment as ComputerRow['department'] };

  return {
    department: null,
    responsibleName: null,
    displayName: reserveDisplayNameOf(computer.name),
  };
}

function destinationMissing(peripheral: TransferPeripheralInput): string {
  return `Diga qual máquina assume a peça que ficou na estação (peça ${peripheral.partId}).`;
}

function partMissing(peripheral: TransferPeripheralInput): string {
  return `A peça ${peripheral.partId} não existe mais no depósito. Recarregue a tela e tente de novo.`;
}
