import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  TICKET_AREAS,
  ticketAreaLabel,
  type TicketArea,
} from '@template/shared/domain/ticket-catalog.util';
import { type UserRole } from '@template/shared/schemas/user.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { canManageAnyRecord, isSuperAdmin } from '../../../lib/policy/access.policy';
import { TicketsRepository, type TicketWithComputer } from '../repository/tickets.repository';

/** O cargo de quem pede, área por área. Área ausente é ausência de cargo — não "cargo mínimo". */
export type AreaAccess = Partial<Record<TicketArea, UserRole>>;

/** Um chamado que a pessoa ALCANÇA, com tudo o que as travas seguintes precisam. */
export type TicketInReach = {
  ticket: TicketWithComputer;
  participantAreas: TicketArea[];
  access: AreaAccess;
};

export const TICKET_NOT_FOUND = 'Chamado não encontrado. Confira o número do protocolo.';

/**
 * QUEM ALCANÇA QUAL CHAMADO, e até onde (#13).
 *
 * Mora num serviço próprio porque duas portas fazem a mesma pergunta: os dados do chamado
 * (`TicketsService`) e a linha do tempo dele (`TicketHistoriesService`). Com a regra copiada
 * nas duas, a primeira correção numa delas deixaria a outra aberta.
 *
 * Os níveis, sobre um mesmo chamado: `user` só consulta; `manager` contribui, mas nunca
 * encerra; `admin` faz tudo.
 */
@Injectable()
export class TicketAccessService {
  constructor(private readonly repository: TicketsRepository) {}

  /**
   * O cargo desta pessoa, área por área — direto do banco, sem o "mínimo `user`" que o cargo
   * interno (#11) aplica em outros lugares: aqui, sem linha, é SEM ACESSO (ver issue #13).
   *
   * Só o SUPER ADMINISTRADOR enxerga tudo por padrão — ele é o único papel sem fronteira
   * nenhuma no sistema (100%, ponta a ponta). Um administrador GLOBAL (`admin`, sem ser
   * `superadmin`) não ganha as três áreas de graça: ele "faz tudo no contexto dele", e esse
   * contexto é o que o cargo interno (#11) diz que é — igual a gestor e a usuário, só que
   * com o nível mais alto quando o cargo existir.
   */
  async resolve(user: RequestUser): Promise<AreaAccess> {
    if (isSuperAdmin(user.role)) {
      return TICKET_AREAS.reduce<AreaAccess>((access, area) => {
        access[area] = 'admin';
        return access;
      }, {});
    }

    return this.repository.contextRolesFor(user.id, user.email);
  }

  /** As áreas em que a pessoa tem ALGUM cargo — é o que ela enxerga (#13). */
  async accessibleAreas(user: RequestUser): Promise<TicketArea[]> {
    const access = await this.resolve(user);

    return TICKET_AREAS.filter((area) => access[area] !== undefined);
  }

  /**
   * Acha o chamado e confere que a pessoa pode LER — o passo comum a toda rota do painel.
   *
   * Ler exige cargo (qualquer nível) em alguma área do chamado — a original, ou participante.
   */
  async reach(user: RequestUser, id: number): Promise<TicketInReach> {
    const ticket = await this.repository.findById(id);
    if (!ticket) throw new NotFoundException(TICKET_NOT_FOUND);

    const participantAreas = await this.repository.listAreasOf(id);
    const access = await this.resolve(user);

    if (areasOf({ ticket, participantAreas }).some((area) => access[area] !== undefined)) {
      return { ticket, participantAreas, access };
    }

    throw new ForbiddenException(
      `Você não tem cargo em ${ticketAreaLabel(ticket.area)} nem nas áreas participantes deste chamado.`,
    );
  }

  /**
   * Atender (mexer em qualquer campo, lançar histórico) exige GESTOR ou ADMINISTRADOR em
   * alguma área do chamado — quem só tem o cargo `user` numa área só CONSULTA (ver issue #13).
   */
  assertCanWrite(reach: TicketInReach): void {
    if (areasOf(reach).some((area) => canManageAnyRecord(reach.access[area]))) return;

    throw new ForbiddenException(
      'Seu cargo nestas áreas só permite consultar — não atender chamados.',
    );
  }

  /**
   * ENCERRAR ou REABRIR exige ADMINISTRADOR em alguma área — gestor contribui (assume, põe em
   * espera, registra andamento), mas nunca tira um chamado da fila nem o devolve a ela.
   */
  assertCanFinalize(reach: TicketInReach): void {
    if (areasOf(reach).some((area) => reach.access[area] === 'admin')) return;

    throw new ForbiddenException(
      'Só quem administra alguma área deste chamado pode encerrá-lo ou reabri-lo.',
    );
  }

  /** Mudar a área (reclassificar ou somar/tirar participante) exige GESTOR em alguma área. */
  assertCanManageArea(reach: TicketInReach, action: string): void {
    if (areasOf(reach).some((area) => canManageAnyRecord(reach.access[area]))) return;

    throw new ForbiddenException(`Só quem gerencia alguma área deste chamado pode ${action} ele.`);
  }
}

/** Todas as áreas do chamado: a original e as participantes. */
function areasOf(reach: Pick<TicketInReach, 'ticket' | 'participantAreas'>): TicketArea[] {
  return [reach.ticket.area, ...reach.participantAreas];
}
