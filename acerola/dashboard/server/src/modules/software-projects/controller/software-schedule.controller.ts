import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import {
  CreateSoftwareScheduleEventDto,
  SoftwareScheduleEventDto,
  SoftwareScheduleQueryDto,
  UpdateSoftwareScheduleEventDto,
} from '../dto/software-project.dto';
import { SoftwareScheduleService } from '../service/software-schedule.service';

@ApiTags('Cronograma Semanal de Sistemas')
@Controller('software-schedule')
export class SoftwareScheduleController {
  constructor(private readonly service: SoftwareScheduleService) {}

  @Get()
  @ApiOperation({ summary: 'Lista os compromissos e janelas do cronograma semanal' })
  @ApiOkResponse({ type: [SoftwareScheduleEventDto] })
  async list(
    @CurrentUser() user: RequestUser,
    @Query() query: SoftwareScheduleQueryDto,
  ): Promise<SoftwareScheduleEventDto[]> {
    return this.service.list(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Abre um compromisso do cronograma por ID' })
  @ApiOkResponse({ type: SoftwareScheduleEventDto })
  @ApiNotFoundResponse({ description: 'Compromisso não encontrado.' })
  async findById(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SoftwareScheduleEventDto> {
    return this.service.findById(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Adiciona um novo compromisso no cronograma' })
  @ApiCreatedResponse({ type: SoftwareScheduleEventDto })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateSoftwareScheduleEventDto,
  ): Promise<SoftwareScheduleEventDto> {
    return this.service.create(user, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um compromisso do cronograma' })
  @ApiOkResponse({ type: SoftwareScheduleEventDto })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateSoftwareScheduleEventDto,
  ): Promise<SoftwareScheduleEventDto> {
    return this.service.update(user, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui um compromisso do cronograma' })
  @ApiNoContentResponse({ description: 'Compromisso excluído.' })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.service.remove(user, id);
  }
}
