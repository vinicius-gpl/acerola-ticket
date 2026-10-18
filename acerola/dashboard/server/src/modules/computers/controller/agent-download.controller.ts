import { Controller, Get, Param, Query, Res, BadRequestException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiParam,
} from '@nestjs/swagger';
import { type Response } from 'express';
import {
  agentDownloadKindSchema,
  agentVersionSchema,
} from '@template/shared/schemas/agent-release.schema';
import { AnyModule } from '../../../lib/auth/module-context.decorator';
import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import { AgentDownloadService } from '../service/agent-download.service';
import {
  AgentDownloadQueryDto,
  AgentFileLinkDto,
  AgentLtsDto,
  AgentReleaseItemDto,
} from '../dto/agent-download.dto';

@ApiTags('Download do agente')
@ApiUnauthorizedResponse({ description: 'Entre no sistema para baixar o agente.' })
@ApiForbiddenResponse({ description: 'Requer acesso a Infraestrutura ou Sistema.' })
@AnyModule()
@Controller('agent/downloads')
export class AgentDownloadController {
  constructor(private readonly service: AgentDownloadService) {}

  @Get('lts')
  @ApiOperation({ summary: 'Consulta a versão LTS disponível para instalação' })
  @ApiOkResponse({ type: AgentLtsDto })
  @ApiNoContentResponse({ description: 'Nenhuma versão LTS promovida.' })
  async lts(
    @CurrentUser() user: RequestUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AgentLtsDto | undefined> {
    response.setHeader('Cache-Control', 'no-store');
    const release = await this.service.lts(user);
    if (release) return release;
    response.status(204);
  }

  @Get('lts/:kind')
  @ApiOperation({ summary: 'Gera um link temporário para um arquivo da versão LTS' })
  @ApiParam({ name: 'kind', enum: agentDownloadKindSchema.options })
  @ApiOkResponse({ type: AgentFileLinkDto })
  async download(
    @CurrentUser() user: RequestUser,
    @Param('kind') kind: string,
    @Query() query: AgentDownloadQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AgentFileLinkDto> {
    response.setHeader('Cache-Control', 'no-store');
    const parsed = agentDownloadKindSchema.safeParse(kind);
    if (!parsed.success) throw new BadRequestException('Escolha um dos arquivos do agente.');
    return this.service.download(user, parsed.data, query.version);
  }

  @Get('releases')
  @ApiOperation({
    summary: 'Lista todas as versões do agente publicadas no R2',
    description:
      'Da mais nova para a mais antiga (até 30), com a LTS marcada. Cada uma baixa pelos mesmos três arquivos da LTS.',
  })
  @ApiOkResponse({ type: [AgentReleaseItemDto] })
  async releases(
    @CurrentUser() user: RequestUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AgentReleaseItemDto[]> {
    response.setHeader('Cache-Control', 'no-store');
    return this.service.releases(user);
  }

  @Get('releases/:version/:kind')
  @ApiOperation({ summary: 'Gera um link temporário para um arquivo de uma versão publicada' })
  @ApiParam({ name: 'version', example: '1.2.3' })
  @ApiParam({ name: 'kind', enum: agentDownloadKindSchema.options })
  @ApiOkResponse({ type: AgentFileLinkDto })
  async downloadVersion(
    @CurrentUser() user: RequestUser,
    @Param('version') version: string,
    @Param('kind') kind: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AgentFileLinkDto> {
    response.setHeader('Cache-Control', 'no-store');
    const parsedKind = agentDownloadKindSchema.safeParse(kind);
    if (!parsedKind.success) throw new BadRequestException('Escolha um dos arquivos do agente.');
    const parsedVersion = agentVersionSchema.safeParse(version);
    if (!parsedVersion.success) throw new BadRequestException('Versão do agente inválida.');
    return this.service.downloadVersion(user, parsedKind.data, parsedVersion.data);
  }
}
