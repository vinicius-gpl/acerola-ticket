import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { type Response } from 'express';

import { Public } from '../../../lib/auth/public.decorator';
import { HealthStatusDto } from '../dto/health.dto';
import { HealthService } from '../service/health.service';

/**
 * A rota que o Traefik (Coolify) consulta para saber se este container pode receber gente.
 *
 * `@Public()` porque quem pergunta não é uma pessoa e não tem login. `@SkipThrottle()` porque
 * healthcheck bate de dez em dez segundos, para sempre: contá-lo na trava faria o container
 * ser reiniciado por excesso de perguntas sobre se ele está vivo.
 */
@ApiTags('Saúde')
@Controller('health')
@Public()
@SkipThrottle()
export class HealthController {
  constructor(private readonly service: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Diz se a aplicação está servindo de verdade',
    description:
      'Responde 200 com o banco de pé e 503 sem ele. Processo vivo não é o mesmo que sistema funcionando: uma partida que falhou ao falar com o banco precisa parecer ruim para o orquestrador reiniciar o container, em vez de deixá-lo no ar respondendo erro a todo mundo.',
  })
  @ApiOkResponse({ type: HealthStatusDto })
  @ApiServiceUnavailableResponse({
    type: HealthStatusDto,
    description: 'O banco não respondeu. O corpo é o mesmo, com `status: down`.',
  })
  async check(
    /* `passthrough` porque o status muda com a resposta, e o corpo continua sendo o DTO: sem
       isto, o 503 sairia pelo filtro global de erro e o corpo viraria mensagem de exceção —
       quem monitora perderia justamente o campo que diz o que caiu. */
    @Res({ passthrough: true }) response: Response,
  ): Promise<HealthStatusDto> {
    const status = await this.service.check();

    response.status(
      status.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE,
    );

    return status;
  }
}
