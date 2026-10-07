import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type CreateSoftwareScheduleEventInput,
  type SoftwareScheduleEvent,
  type SoftwareScheduleQuery,
  type UpdateSoftwareScheduleEventInput,
} from '@template/shared/schemas/software-schedule.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import {
  assertCanManageInContext,
  assertCanRead,
} from '../../../lib/policy/policy-assert.util';
import { toSoftwareScheduleEvent } from '../mapper/software-projects.mapper';
import { SoftwareScheduleRepository } from '../repository/software-schedule.repository';

export const SCHEDULE_EVENT_NOT_FOUND = 'Compromisso não encontrado.';

@Injectable()
export class SoftwareScheduleService {
  constructor(private readonly repository: SoftwareScheduleRepository) {}

  async list(user: RequestUser, query: SoftwareScheduleQuery): Promise<SoftwareScheduleEvent[]> {
    assertCanRead(user.role, 'o cronograma de sistemas');

    const rows = await this.repository.listBetween(query.startDate, query.endDate);
    return rows.map((row) => toSoftwareScheduleEvent(row, row.projectName ?? undefined));
  }

  async findById(user: RequestUser, id: number): Promise<SoftwareScheduleEvent> {
    assertCanRead(user.role, 'o cronograma de sistemas');

    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundException(SCHEDULE_EVENT_NOT_FOUND);

    return toSoftwareScheduleEvent(row, row.projectName ?? undefined);
  }

  async create(
    user: RequestUser,
    input: CreateSoftwareScheduleEventInput,
  ): Promise<SoftwareScheduleEvent> {
    assertCanManageInContext(user, 'sistema', 'agendar no cronograma');

    const row = await this.repository.insert({
      projectId: input.projectId ?? null,
      title: input.title,
      category: input.category,
      color: input.color,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      note: input.note ?? null,
      createdBy: user.email,
    });

    return toSoftwareScheduleEvent(row);
  }

  async update(
    user: RequestUser,
    id: number,
    input: UpdateSoftwareScheduleEventInput,
  ): Promise<SoftwareScheduleEvent> {
    assertCanManageInContext(user, 'sistema', 'alterar agendamento do cronograma');

    await this.findById(user, id);

    const row = await this.repository.update(id, {
      ...(input.projectId !== undefined && { projectId: input.projectId }),
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.date !== undefined && { date: input.date }),
      ...(input.startTime !== undefined && { startTime: input.startTime }),
      ...(input.endTime !== undefined && { endTime: input.endTime }),
      ...(input.note !== undefined && { note: input.note?.trim() || null }),
      updatedAt: new Date(),
      updatedBy: user.email,
    });

    return toSoftwareScheduleEvent(row);
  }

  async remove(user: RequestUser, id: number): Promise<void> {
    assertCanManageInContext(user, 'sistema', 'excluir agendamento do cronograma');

    await this.findById(user, id);
    await this.repository.remove(id);
  }
}
