import type { SessionUser } from '../schemas/user.schema';

type User = Pick<SessionUser, 'role' | 'roles'>;

export function systemRole(user: User) {
  return user.role === 'superadmin' ? 'superadmin' : (user.roles?.sistema ?? 'user');
}

export function canEditSystem(user: User): boolean {
  return ['admin', 'superadmin'].includes(systemRole(user));
}

export function requiresSystemGithub(user: User): boolean {
  return canEditSystem(user);
}
