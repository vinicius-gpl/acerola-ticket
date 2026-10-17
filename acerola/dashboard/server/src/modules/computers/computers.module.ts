import { AgentDownloadController } from './controller/agent-download.controller';
import { AgentDownloadService } from './service/agent-download.service';
import { Module } from '@nestjs/common';

import { AgentReleaseController } from './controller/agent-release.controller';
import { AgentReleaseRepository } from './repository/agent-release.repository';
import { AgentReleaseService } from './service/agent-release.service';

import { ComputersController } from './controller/computers.controller';
import { AgentGateway } from './gateway/agent.gateway';
import { AgentPresenceService } from './presence/agent-presence.service';
import { LiveWatchService } from './presence/live-watch.service';
import { ComputersRepository } from './repository/computers.repository';
import { ComputersService } from './service/computers.service';

/**
 * O índice da pasta: é o único arquivo fora das subpastas, e aponta para todo o resto.
 *
 * O `AgentGateway` entra como provider, e não como controller, porque ele não atende HTTP:
 * ele é a ponta de WebSocket por onde os agentes conectam. Para ele funcionar, a aplicação
 * precisa subir com o adaptador de WebSocket registrado — ver `main.ts`.
 */
@Module({
  controllers: [ComputersController, AgentReleaseController, AgentDownloadController],
  providers: [
    AgentDownloadService,
    AgentReleaseRepository,
    AgentReleaseService,
    ComputersService,
    ComputersRepository,
    AgentPresenceService,
    LiveWatchService,
    AgentGateway,
  ],
  exports: [ComputersService, AgentPresenceService],
})
export class ComputersModule {}
