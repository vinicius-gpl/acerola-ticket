import { Injectable } from '@nestjs/common';
import {
  type SoftwareTimelineEvent,
  type SoftwareTimelineListQuery,
} from '@template/shared/schemas/software-timeline.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { assertCanRead } from '../../../lib/policy/policy-assert.util';
import { toSoftwareTimelineEvent } from '../mapper/software-projects.mapper';
import { SoftwareTimelineRepository } from '../repository/software-timeline.repository';

@Injectable()
export class SoftwareTimelineService {
  constructor(private readonly repository: SoftwareTimelineRepository) {}

  async list(
    user: RequestUser,
    query: SoftwareTimelineListQuery,
  ): Promise<{ items: SoftwareTimelineEvent[]; total: number; page: number; pageSize: number }> {
    assertCanRead(user.role, 'a linha do tempo dos sistemas');

    const page = await this.repository.list(query);
    const items = page.rows.map((row) =>
      toSoftwareTimelineEvent(row, row.projectName ?? undefined),
    );

    return {
      items,
      total: page.total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}
