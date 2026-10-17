import {
  Inject,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  agentReleaseManifestSchema,
  type AgentReleaseDownload,
} from '@template/shared/schemas/agent-release.schema';

import { DOWNLOAD_URL_TTL_SECONDS, type FileStorage } from '../../../lib/storage/file-storage.type';
import { STORAGE } from '../../../lib/storage/storage.token';
import { AgentReleaseRepository } from '../repository/agent-release.repository';
import { ComputersService } from './computers.service';

@Injectable()
export class AgentReleaseService {
  constructor(
    private readonly computers: ComputersService,
    private readonly releases: AgentReleaseRepository,
    @Inject(STORAGE) private readonly storage: FileStorage,
  ) {}

  async latest(authorization: string | undefined): Promise<AgentReleaseDownload | null> {
    const token = /^Bearer ([^\s]+)$/.exec(authorization ?? '')?.[1];
    if (!token || token.length > 512)
      throw new UnauthorizedException('Chave do agente ausente ou inválida.');
    const identity = await this.computers.authenticateAgent(token);
    if (!identity.ok) {
      if (identity.reason === 'blocked')
        throw new ForbiddenException('Este computador está bloqueado.');
      throw new UnauthorizedException('Chave do agente inválida.');
    }
    const raw = await this.releases.latest();
    if (raw === null) return null;
    const parsed = agentReleaseManifestSchema.safeParse(raw);
    if (!parsed.success)
      throw new ServiceUnavailableException('A versão do agente está indisponível.');
    const { version, artifacts } = parsed.data;
    const msi = artifacts.msi;
    const url = await this.storage.downloadUrl(
      msi.key,
      DOWNLOAD_URL_TTL_SECONDS,
      `acerola-agent-${version}-x64.msi`,
    );

    return { version, url, sha256: msi.sha256, sizeBytes: msi.sizeBytes };
  }
}
