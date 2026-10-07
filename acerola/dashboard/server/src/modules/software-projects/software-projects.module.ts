import { Module } from '@nestjs/common';

import { SoftwareDashboardController } from './controller/software-dashboard.controller';
import { SoftwareProjectsController } from './controller/software-projects.controller';
import { SoftwareScheduleController } from './controller/software-schedule.controller';
import { SoftwareTimelineController } from './controller/software-timeline.controller';
import { SoftwareProjectsRepository } from './repository/software-projects.repository';
import { SoftwareScheduleRepository } from './repository/software-schedule.repository';
import { SoftwareTimelineRepository } from './repository/software-timeline.repository';
import { GithubService } from './service/github.service';
import { SoftwareDashboardService } from './service/software-dashboard.service';
import { SoftwareProjectsService } from './service/software-projects.service';
import { SoftwareScheduleService } from './service/software-schedule.service';
import { SoftwareTimelineService } from './service/software-timeline.service';

@Module({
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
    GithubService,
    SoftwareProjectsService,
    SoftwareTimelineService,
    SoftwareScheduleService,
    SoftwareDashboardService,
  ],
  exports: [SoftwareProjectsService, GithubService],
})
export class SoftwareProjectsModule {}
