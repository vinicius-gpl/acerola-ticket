import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import {
  CreateSoftwareTimelineEventDto,
  SoftwareTimelineEventDto,
  SoftwareTimelineListQueryDto,
  SoftwareTimelineListResponseDto,
} from '../dto/software-project.dto';
import { SoftwareTimelineService } from '../service/software-timeline.service';

@ApiTags('Timeline e Pull Requests de Software')
@Controller('software-timeline')
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

  @Post()
  @ApiOperation({ summary: 'Registra um novo evento manual na timeline do sistema' })
  @ApiCreatedResponse({ type: SoftwareTimelineEventDto })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateSoftwareTimelineEventDto,
  ): Promise<SoftwareTimelineEventDto> {
    return this.service.create(user, body);
  }
}
