import { Injectable } from '@nestjs/common';
import { type HealthStatus } from '@template/shared/schemas/health.schema';

import { HealthRepository } from '../repository/health.repository';

/**
 * Responde uma pergunta só: este container está servindo DE VERDADE?
 *
 * Não tem policy, e é o único service do projeto sem ela: a rota é pública porque quem
 * pergunta é o Traefik, que não tem login. Em troca, a resposta não conta NADA sobre o
 * sistema — nem versão, nem endereço de banco, nem mensagem de erro. Só `up`/`down`.
 */
@Injectable()
export class HealthService {
  constructor(private readonly repository: HealthRepository) {}

  async check(): Promise<HealthStatus> {
    const isDatabaseUp = await this.repository.isDatabaseUp();

    return {
      status: isDatabaseUp ? 'ok' : 'down',
      database: isDatabaseUp ? 'up' : 'down',
      uptimeSeconds: Math.floor(process.uptime()),
      checkedAt: new Date().toISOString(),
    };
  }
}
