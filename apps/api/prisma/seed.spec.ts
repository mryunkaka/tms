import * as argon2 from 'argon2';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { provisionInitialAdmin } from './seed.js';

describe('admin seed', () => {
  const prisma = {
    role: { upsert: jest.fn<(...args: unknown[]) => Promise<unknown>>() },
    user: {
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    userRole: {
      findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      upsert: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.role.upsert.mockImplementation(async (args: unknown) => {
      const name = (args as { where: { name: string } }).where.name;
      return { id: `role-${name.toLowerCase()}`, name };
    });
    prisma.userRole.upsert.mockResolvedValue({});
  });

  it('keeps the password hash of an existing admin on a repeated seed', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', email: 'admin@example.test', passwordHash: 'existing-hash' });
    prisma.userRole.findFirst.mockResolvedValue({ userId: 'admin-1' });
    await provisionInitialAdmin(prisma as never, 'admin@example.test', 'new-password-value');
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.userRole.upsert).toHaveBeenCalled();
  });

  it('hashes the password when creating the first admin', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(async (args: unknown) => ({
      id: 'admin-1', email: 'admin@example.test', ...(args as { data: { passwordHash: string } }).data,
    }));
    const result = await provisionInitialAdmin(prisma as never, 'admin@example.test', 'strong-password');
    expect(result).toBeUndefined();
    const createCall = prisma.user.create.mock.calls[0]?.[0] as { data: { passwordHash: string } };
    expect(await argon2.verify(createCall.data.passwordHash, 'strong-password')).toBe(true);
  });

  it('does not grant admin role to an existing non-admin account', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'agent@example.test' });
    prisma.userRole.findFirst.mockResolvedValue(null);
    await expect(provisionInitialAdmin(prisma as never, 'agent@example.test', 'strong-password')).rejects.toThrow('without the ADMIN role');
    expect(prisma.userRole.upsert).not.toHaveBeenCalled();
  });
});
