import { type SessionUser } from '@template/shared/schemas/user.schema';

/**
 * Quem aparece no rodapé do menu, enquanto não há provedor de identidade.
 *
 * É a MESMA pessoa fixa do servidor (`server/src/lib/auth/identity.provider.ts`). A tela só
 * a mostra — quem decide o que ela pode é o servidor, e o navegador não manda identidade
 * nenhuma (ver `lib/api/http-client.ts`).
 *
 * A sessão não é persistida: o valor vive só em memória. Num escritório de máquinas
 * compartilhadas, sessão no `localStorage` faz a próxima pessoa herdar a conta da anterior.
 */
export const MOCK_SESSION_USER: SessionUser = {
  id: 'mock-open-login',
  email: 'dev@template.local',
  name: 'Usuário de desenvolvimento',
  role: 'admin',
};

export const mockAuth = {
  getUser: (): SessionUser => MOCK_SESSION_USER,
};
