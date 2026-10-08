import { Module } from '@nestjs/common';
import { GithubIntegrationController } from './controller/github-integration.controller';
import { GithubConnectionsRepository } from './repository/github-connections.repository';
import { GithubOauthService } from './service/github-oauth.service';
import { GithubLinkedGuard } from './github-linked.guard';
import { GithubAppService } from './service/github-app.service';

@Module({
  controllers: [GithubIntegrationController],
  providers: [GithubConnectionsRepository, GithubOauthService, GithubLinkedGuard, GithubAppService],
  exports: [GithubOauthService, GithubLinkedGuard, GithubAppService],
})
export class GithubIntegrationModule {}
