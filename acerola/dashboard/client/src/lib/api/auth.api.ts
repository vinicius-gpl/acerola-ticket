import { type AuthConfig } from '@template/shared/schemas/auth.schema';
import { type SessionUser } from '@template/shared/schemas/user.schema';

import { apiRequest } from './http-client';

/**
 * Perguntas que a tela faz à NOSSA API sobre identidade: "quem sou eu aqui?" e a configuração
 * do Neon Auth quando ela não estiver no bundle compilado do frontend.
 *
 * Entrar e sair acontecem no Neon Auth (`lib/auth/neon-auth.client.ts`). O que só a nossa
 * API sabe é o PAPEL da pessoa — `user`, `manager` ou `admin` —, lido do cadastro a cada
 * requisição. É por isso que a tela pergunta aqui, e não ao token.
 */
export const authApi = {
  /** Quem está logado agora — ou lança 401 se ninguém estiver. */
  me: () => apiRequest<SessionUser>('/auth/me'),
  /** Configuração pública do Neon Auth para a tela. */
  config: () => apiRequest<AuthConfig>('/auth/config'),
};

