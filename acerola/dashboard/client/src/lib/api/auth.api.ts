import { type LoginInput } from '@template/shared/schemas/auth.schema';
import { type SessionUser } from '@template/shared/schemas/user.schema';

import { apiRequest } from './http-client';

/**
 * Chamadas da API de login. A sessão em si é o cookie `HttpOnly` que o navegador já manda
 * sozinho — nada aqui guarda token ou usuário; ver `apiRequest`.
 */
export const authApi = {
  login: (body: LoginInput) => apiRequest<SessionUser>('/auth/login', { method: 'POST', body }),

  logout: () => apiRequest<void>('/auth/logout', { method: 'POST' }),

  /** Quem está logado agora — ou lança 401 se ninguém estiver. */
  me: () => apiRequest<SessionUser>('/auth/me'),
};
