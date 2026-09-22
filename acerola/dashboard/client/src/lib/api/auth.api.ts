import { type SessionUser } from '@template/shared/schemas/user.schema';

import { apiRequest } from './http-client';

/**
 * A única pergunta que a tela faz à NOSSA API sobre identidade: "quem sou eu aqui?".
 *
 * Entrar e sair acontecem no Neon Auth (`lib/auth/neon-auth.client.ts`). O que só a nossa
 * API sabe é o PAPEL da pessoa — `user`, `manager` ou `admin` —, lido do cadastro a cada
 * requisição. É por isso que a tela pergunta aqui, e não ao token.
 */
export const authApi = {
  /** Quem está logado agora — ou lança 401 se ninguém estiver. */
  me: () => apiRequest<SessionUser>('/auth/me'),
};
