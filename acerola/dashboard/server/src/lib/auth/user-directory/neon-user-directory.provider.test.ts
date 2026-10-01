import { describe, expect, it, vi } from 'vitest';

import { type Database } from '../../db/db.type';
import { type NeonAuthUserRow } from '../../db/neon-auth-user.table';
import { NeonUserDirectoryProvider } from './neon-user-directory.provider';

function createMockRow(overrides: Partial<NeonAuthUserRow> = {}): NeonAuthUserRow {
  return {
    id: 'user_123',
    name: 'Carlos Oliveira',
    email: 'carlos@empresa.com.br',
    emailVerified: true,
    image: 'https://cdn.empresa.com.br/carlos.jpg',
    createdAt: new Date('2026-09-15T10:00:00.000Z'),
    updatedAt: new Date('2026-09-15T10:00:00.000Z'),
    role: 'manager',
    banned: false,
    banReason: null,
    banExpires: null,
    ...overrides,
  };
}

describe('NeonUserDirectoryProvider', () => {
  it('lists all users ordered by name', async () => {
    const mockRow = createMockRow();
    const fakeDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([mockRow]),
        }),
      }),
    } as unknown as Database;

    const provider = new NeonUserDirectoryProvider(fakeDb);
    const users = await provider.listUsers();

    expect(users).toHaveLength(1);
    expect(users[0]).toEqual({
      id: 'user_123',
      name: 'Carlos Oliveira',
      email: 'carlos@empresa.com.br',
      image: 'https://cdn.empresa.com.br/carlos.jpg',
      role: 'manager',
      banned: false,
      createdAt: '2026-09-15T10:00:00.000Z',
    });
  });

  it('finds a user by id when exists', async () => {
    const mockRow = createMockRow({ id: 'target_id', name: 'Ana Beatriz' });
    const fakeDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockRow]),
          }),
        }),
      }),
    } as unknown as Database;

    const provider = new NeonUserDirectoryProvider(fakeDb);
    const user = await provider.getUserById('target_id');

    expect(user).not.toBeNull();
    expect(user?.id).toBe('target_id');
    expect(user?.name).toBe('Ana Beatriz');
  });

  it('returns null when user is not found', async () => {
    const fakeDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as unknown as Database;

    const provider = new NeonUserDirectoryProvider(fakeDb);
    const user = await provider.getUserById('non_existent');

    expect(user).toBeNull();
  });
});
