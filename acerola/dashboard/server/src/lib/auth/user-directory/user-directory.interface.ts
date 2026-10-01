import { type DirectoryUser } from '@template/shared/schemas/user.schema';

/**
 * Contrato para fornecimento de usuários do diretório de identidade.
 *
 * ARQUITETURA E DESACOPLAMENTO:
 * Hoje as contas vivem no banco da Neon Auth (`neon_auth.user`).
 * No futuro próximo, o sistema passará a se comunicar com a API do proxy `auth-forward`.
 * Esta interface garante que nenhum serviço de negócio (ex: RolesService, TasksService)
 * conheça tabelas do Neon Auth diretamente. Para trocar para o `auth-forward`,
 * basta criar `AuthForwardUserDirectoryProvider` e alterar a injeção em `AuthModule`.
 */
export interface UserDirectoryProvider {
  /** Lista todas as pessoas cadastradas no diretório de identidade. */
  listUsers(): Promise<DirectoryUser[]>;

  /** Busca uma pessoa específica pelo seu identificador único. */
  getUserById(id: string): Promise<DirectoryUser | null>;
}
