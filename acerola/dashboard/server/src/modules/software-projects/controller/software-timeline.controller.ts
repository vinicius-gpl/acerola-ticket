import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { GithubLinkedGuard } from '../../github-integration/github-linked.guard';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import {
  SoftwareTimelineListQueryDto,
  SoftwareTimelineListResponseDto,
} from '../dto/software-project.dto';
import { SoftwareTimelineService } from '../service/software-timeline.service';
import { ModuleContext } from '../../../lib/auth/module-context.decorator';

@ApiTags('Timeline e Pull Requests de Software')
@ModuleContext('sistema')
@Controller('software-timeline')
@UseGuards(GithubLinkedGuard)
export class SoftwareTimelineController {
  constructor(private readonly service: SoftwareTimelineService) {}

  @Get()
  @ApiOperation({ summary: 'Lista os eventos e Pull Requests da timeline dos sistemas' })
  @ApiOkResponse({ type: SoftwareTimelineListResponseDto })
  async list(
    @CurrentUser() user: RequestUser,
    @Query() query: SoftwareTimelineListQueryDto,
  ): Promise<SoftwareTimelineListResponseDto> {
    return this.service.list(user, query);
  }
}
