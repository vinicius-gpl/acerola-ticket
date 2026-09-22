import { type UserRole } from '@template/shared/schemas/user.schema';

/**
 * A conta de desenvolvimento, pra logar na tela sem precisar cadastrar ninguém.
 *
 * Credencial FICTÍCIA e documentada aqui mesmo (CONTRIBUTING §9) — nunca use isto em
 * produção. A senha entra em texto puro só neste arquivo de seed; o que vai para o banco é o
 * hash (`seed-users.ts`).
 */
export type UserSeedInput = {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  password: string;
};

export const USERS_SEED: UserSeedInput[] = [
  {
    id: 1,
    email: 'dev@template.local',
    name: 'Usuário de desenvolvimento',
    role: 'admin',
    password: 'dev12345',
  },
];
