import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type InternalRoleRow } from '../../../lib/db/schema/internal-roles.schema';
import { type RolesRepository } from '../repository/roles.repository';
import { RolesService } from './roles.service';

const ADMIN: RequestUser = {
  id: 'admin_1',
  email: 'admin@empresa.com.br',
  name: 'Administrador',
  role: 'admin',
};

const MANAGER: RequestUser = {
  id: 'manager_1',
  email: 'gestor@empresa.com.br',
  name: 'Gestor',
  role: 'manager',
};

const USER: RequestUser = {
  id: 'user_1',
  email: 'user@empresa.com.br',
  name: 'Usuario Comum',
  role: 'user',
};

const ROW: InternalRoleRow = {
  id: 1,
  userId: 'user_1',
  userEmail: 'user@empresa.com.br',
  context: 'manutencao',
  role: 'manager',
  createdAt: new Date('2026-10-01T12:00:00.000Z'),
  createdBy: 'admin@empresa.com.br',
  updatedAt: null,
  updatedBy: null,
};

describe('RolesService', () => {
  let repository: RolesRepository;
  let service: RolesService;

  beforeEach(() => {
    repository = {
      list: vi.fn().mockResolvedValue([ROW]),
      findById: vi.fn().mockResolvedValue(ROW),
      findByUserIdOrEmail: vi.fn().mockResolvedValue([ROW]),
      upsert: vi.fn().mockResolvedValue(ROW),
      delete: vi.fn().mockResolvedValue(undefined),
    } as unknown as RolesRepository;

    service = new RolesService(repository);
  });

  describe('list', () => {
    // feliz
    it('allows admin to list all internal roles', async () => {
      const result = await service.list(ADMIN);
      expect(result).toHaveLength(1);
      expect(result[0]!.userId).toBe('user_1');
      expect(result[0]!.context).toBe('manutencao');
      expect(result[0]!.role).toBe('manager');
    });

    // triste
    it('refuses manager with ForbiddenException', async () => {
      await expect(service.list(MANAGER)).rejects.toThrow(ForbiddenException);
    });

    it('refuses plain user with ForbiddenException', async () => {
      await expect(service.list(USER)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('assign', () => {
    // feliz
    it('allows admin to assign a role in a context', async () => {
      const input = {
        userId: 'user_1',
        userEmail: 'user@empresa.com.br',
        context: 'manutencao' as const,
        role: 'manager' as const,
      };

      const result = await service.assign(ADMIN, input);
      expect(repository.upsert).toHaveBeenCalledWith({
        userId: 'user_1',
        userEmail: 'user@empresa.com.br',
        context: 'manutencao',
        role: 'manager',
        createdBy: ADMIN.email,
        updatedBy: ADMIN.email,
      });
      expect(result.role).toBe('manager');
    });

    // triste
    it('refuses manager from assigning roles', async () => {
      await expect(
        service.assign(MANAGER, {
          userId: 'user_1',
          context: 'sistema',
          role: 'admin',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('refuses plain user from assigning roles', async () => {
      await expect(
        service.assign(USER, {
          userId: 'user_1',
          context: 'sistema',
          role: 'admin',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    // feliz
    it('allows admin to delete an internal role', async () => {
      await expect(service.delete(ADMIN, 1)).resolves.toBeUndefined();
      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    // triste
    it('refuses non-admin from deleting roles', async () => {
      await expect(service.delete(MANAGER, 1)).rejects.toThrow(ForbiddenException);
      await expect(service.delete(USER, 1)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when role does not exist', async () => {
      vi.mocked(repository.findById).mockResolvedValue(null);

      await expect(service.delete(ADMIN, 999)).rejects.toThrow(NotFoundException);
    });
  });
});
