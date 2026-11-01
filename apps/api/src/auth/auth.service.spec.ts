import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AuthService, hashRefreshToken } from './auth.service.js';

describe('AuthService', () => {
  const prisma = {
    user: { findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>() },
    refreshToken: { create: jest.fn<(...args: unknown[]) => Promise<unknown>>(), updateMany: jest.fn<(...args: unknown[]) => Promise<unknown>>() },
    $transaction: jest.fn<(callback: unknown) => Promise<unknown>>(),
  };
  const jwt = { signAsync: jest.fn<() => Promise<string>>().mockResolvedValue('signed-access-token') } as unknown as JwtService;
  const env = { ACCESS_TOKEN_TTL_SECONDS: 900, REFRESH_TOKEN_TTL_DAYS: 30 } as never;
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(prisma as never, jwt, env);
  });

  it('stores only a SHA-256 digest for an opaque token', () => {
    expect(hashRefreshToken('opaque-secret')).toMatch(/^[a-f0-9]{64}$/);
    expect(hashRefreshToken('opaque-secret')).not.toBe('opaque-secret');
  });

  it('denies credentials for an account without the ADMIN role', async () => {
    prisma.user.findUnique.mockResolvedValue({ isActive: true, passwordHash: '$argon2id$invalid', roles: [{ role: { name: 'AGENT' } }] });
    await expect(service.login('a@example.test', 'password')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('revokes the complete token family when a revoked refresh token is reused', async () => {
    const now = new Date();
    const tx: { refreshToken: { findUnique: jest.Mock; updateMany: jest.Mock } } = {
      refreshToken: {
        findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({ revokedAt: now, familyId: 'family-1', expiresAt: new Date(now.getTime() + 1000) }),
        updateMany: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({ count: 2 }),
      },
    };
    prisma.$transaction.mockImplementation((callback) => Promise.resolve((callback as (transaction: typeof tx) => unknown)(tx)));
    await expect(service.refresh('previous-token')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(tx.refreshToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { familyId: 'family-1', revokedAt: null } }));
  });

  it('rotates a valid refresh token and persists only the replacement hash', async () => {
    const tx = {
      refreshToken: {
        findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({
          id: 'token-1', tokenHash: hashRefreshToken('old-token'), familyId: 'family-1', userId: 'user-1',
          expiresAt: new Date(Date.now() + 60_000), revokedAt: null,
          user: { id: 'user-1', email: 'admin@example.test', isActive: true, roles: [{ role: { name: 'ADMIN' } }] },
        }),
        updateMany: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({ count: 1 }),
        create: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({}),
      },
    };
    prisma.$transaction.mockImplementation((callback) => Promise.resolve((callback as (transaction: typeof tx) => unknown)(tx)));
    const result = await service.refresh('old-token');
    expect(result.accessToken).toBe('signed-access-token');
    expect(result.refreshToken).not.toBe('old-token');
    expect(tx.refreshToken.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tokenHash: hashRefreshToken(result.refreshToken), familyId: 'family-1' }),
    }));
  });

  it('revokes the current session during logout', async () => {
    await service.logout('active-token');
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { tokenHash: hashRefreshToken('active-token'), revokedAt: null },
    }));
  });
});
