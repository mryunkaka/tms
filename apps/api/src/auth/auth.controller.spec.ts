import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Request, Response } from 'express';

jest.unstable_mockModule('@nestjs/throttler', () => ({ Throttle: () => () => undefined }));
const { AuthController } = await import('./auth.controller.js');

describe('AuthController security headers', () => {
  const env = { NODE_ENV: 'production', WEB_ORIGIN: 'https://tms.example.test', REFRESH_TOKEN_TTL_DAYS: 30 } as never;
  const auth = {
    login: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({
      accessToken: 'access-test', refreshToken: 'refresh-test',
      user: { id: 'admin-test', email: 'admin@example.test', roles: ['ADMIN'] },
    }),
    refresh: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    logout: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    me: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  beforeEach(() => { jest.clearAllMocks(); });

  it('sets a Secure, HttpOnly, SameSite=Lax refresh cookie in production', async () => {
    const controller = new AuthController(auth as never, env);
    const response = { cookie: jest.fn() } as unknown as Response;
    await controller.login(
      { email: 'admin@example.test', password: 'test-password' },
      { headers: { origin: 'https://tms.example.test' } } as Request,
      response,
    );
    expect(response.cookie).toHaveBeenCalledWith('tms_refresh', 'refresh-test', expect.objectContaining({
      httpOnly: true, secure: true, sameSite: 'lax', path: '/api/v1/auth', maxAge: 30 * 24 * 60 * 60 * 1000,
    }));
  });

  it('rejects a mutation from a different origin before login', async () => {
    const controller = new AuthController(auth as never, env);
    await expect(controller.login(
      { email: 'admin@example.test', password: 'test-password' },
      { headers: { origin: 'https://attacker.example' } } as Request,
      { cookie: jest.fn() } as unknown as Response,
    )).rejects.toBeInstanceOf(UnauthorizedException);
    expect(auth.login).not.toHaveBeenCalled();
  });
});
