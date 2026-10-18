import { Module } from '@nestjs/common';
import { AuthModule } from '../../lib/auth/auth.module';
import { GithubIntegrationModule } from '../github-integration/github-integration.module';
import { RolesModule } from '../roles/roles.module';
import { TicketAssigneesService } from '../tickets/service/ticket-assignees.service';

import { SoftwareDashboardController } from './controller/software-dashboard.controller';
import { SoftwareProjectsController } from './controller/software-projects.controller';
import { SoftwareScheduleController } from './controller/software-schedule.controller';
import { SoftwareTimelineController } from './controller/software-timeline.controller';
import { SoftwareDashboardRepository } from './repository/software-dashboard.repository';
import { SoftwareProjectsRepository } from './repository/software-projects.repository';
import { SoftwareScheduleRepository } from './repository/software-schedule.repository';
import { SoftwareTimelineRepository } from './repository/software-timeline.repository';
import { GithubDailySyncService } from './service/github-daily-sync.service';
import { GithubService } from './service/github.service';
import { SoftwareDashboardService } from './service/software-dashboard.service';
import { SoftwareProjectsService } from './service/software-projects.service';
import { SoftwareScheduleService } from './service/software-schedule.service';
import { SoftwareTimelineService } from './service/software-timeline.service';

/* `TicketAssigneesService` entra como provider daqui, e não importando o módulo de chamados:
   ele já importa este (chamado de Sistema aponta para um sistema), e o contrário faria um
   ciclo. O serviço não guarda estado — duas instâncias não divergem. */
@Module({
  imports: [GithubIntegrationModule, AuthModule, RolesModule],
  controllers: [
    SoftwareProjectsController,
    SoftwareTimelineController,
    SoftwareScheduleController,
    SoftwareDashboardController,
  ],
  providers: [
    SoftwareProjectsRepository,
    SoftwareTimelineRepository,
    SoftwareScheduleRepository,
    SoftwareDashboardRepository,
    GithubService,
    GithubDailySyncService,
    SoftwareProjectsService,
    SoftwareTimelineService,
    SoftwareScheduleService,
    SoftwareDashboardService,
    TicketAssigneesService,
  ],
  exports: [SoftwareProjectsService, GithubService],
})
export class SoftwareProjectsModule {}
