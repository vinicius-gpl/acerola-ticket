import { agentReleaseDownloadSchema } from '@template/shared/schemas/agent-release.schema';
import { createZodDto } from 'nestjs-zod';

export class AgentReleaseDownloadDto extends createZodDto(agentReleaseDownloadSchema) {}
