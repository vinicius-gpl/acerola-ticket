import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../../lib/auth/current-user.decorator';
import { Public } from '../../../lib/auth/public.decorator';
import { type RequestUser } from '../../../lib/auth/request-user.type';
import {
  CreateNetworkEventDto,
  NetworkEventDto,
  NetworkEventListQueryDto,
  NetworkEventListResponseDto,
  NetworkSummaryDto,
  NetworkWebhookDto,
  ResolveNetworkEventDto,
} from '../dto/network-event.dto';
import { NetworkService } from '../service/network.service';

/**
 * O controller só recebe e entrega. Nenhuma regra aqui: ela vive no service.
 *
 * Uma rota é `@Public()` — o webhook do UniFi. O controlador da rede não tem login: ele prova
 * quem é apresentando o token na URL, e quem confere isso é o service.
 */
@ApiTags('Rede')
@Controller('network')
export class NetworkController {
  constructor(private readonly service: NetworkService) {}

  @Get('events')
  @ApiOperation({
    summary: 'Lista os eventos de rede',
    description: 'Do mais recente para o mais antigo. `onlyOpen` traz só o que ainda está em pé.',
  })
  @ApiOkResponse({ type: NetworkEventListResponseDto })
  async list(
    @CurrentUser() user: RequestUser,
    @Query() query: NetworkEventListQueryDto,
  ): Promise<NetworkEventListResponseDto> {
    return this.service.list(user, query);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'O resumo da rede no período',
    description:
      'Quedas, tempo total fora do ar e os piores números de latência e perda. O tempo fora soma só as quedas que já terminaram — uma queda em aberto ainda não tem duração.',
  })
  @ApiOkResponse({ type: NetworkSummaryDto })
  async summary(
    @CurrentUser() user: RequestUser,
    @Query('days') days?: string,
  ): Promise<NetworkSummaryDto> {
    return this.service.summary(user, days ? Number(days) : undefined);
  }

  @Post('events')
  @ApiOperation({
    summary: 'Registra um evento de rede à mão',
    description: 'Para a queda que não veio pelo UniFi — a do provedor que ligou avisando.',
  })
  @ApiCreatedResponse({ type: NetworkEventDto })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateNetworkEventDto,
  ): Promise<NetworkEventDto> {
    return this.service.create(user, body);
  }

  @Patch('events/:id/resolution')
  @ApiOperation({
    summary: 'Marca um evento como resolvido, ou reabre',
    description:
      'Resolver NÃO apaga o evento: ele continua no histórico. "A internet caiu três vezes este mês" é uma pergunta que só o histórico responde.',
  })
  @ApiOkResponse({ type: NetworkEventDto })
  @ApiNotFoundResponse({ description: 'Evento não encontrado.' })
  async resolve(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ResolveNetworkEventDto,
  ): Promise<NetworkEventDto> {
    return this.service.resolve(user, id, body.isResolved);
  }

  @Public()
  @Post('webhook')
  @ApiOperation({
    summary: 'A porta do UniFi: recebe um alerta de rede',
    description:
      'Pública de propósito — o controlador da rede não tem login. Ele prova quem é com `?token=`, que precisa bater com a variável `UNIFI_WEBHOOK_TOKEN` do servidor. Sem a variável configurada, a porta fica FECHADA. O corpo inteiro é guardado como veio.',
  })
  @ApiCreatedResponse({ type: NetworkEventDto })
  @ApiUnauthorizedResponse({ description: 'Token do webhook inválido ou não configurado.' })
  async webhook(
    @Query('token') token: string | undefined,
    @Body() body: NetworkWebhookDto,
  ): Promise<NetworkEventDto> {
    return this.service.ingest(token, body);
  }
}
