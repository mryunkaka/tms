import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from '../src/database/prisma.service.js';
import { AuthService } from '../src/auth/auth.service.js';

jest.unstable_mockModule('@nestjs/throttler', () => ({
  ThrottlerModule: { forRoot: () => ({ module: class MockThrottlerModule {} }) },
  ThrottlerGuard: class MockThrottlerGuard { canActivate() { return true; } },
  Throttle: () => () => undefined,
}));

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://tms:tms@localhost:5432/tms';
process.env.JWT_ACCESS_SECRET = 'test-only-access-secret-with-enough-entropy';
process.env.WEB_ORIGIN = 'http://localhost:3000';

describe('health route', () => {
  let app: INestApplication;
  const authMock = {
    login: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    refresh: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    logout: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    me: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  beforeAll(async () => {
    const { AppModule } = await import('../src/app.module.js');
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService).useValue({})
      .overrideProvider(AuthService).useValue(authMock)
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => { if (app) await app.close(); });

  it('returns a healthy response', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200).expect({ status: 'ok' });
  });

  it('denies anonymous and non-admin access to admin routes', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/ping').expect(401);
    const jwt = app.get(JwtService);
    const agentToken = await jwt.signAsync({ sub: 'agent-1', roles: ['AGENT'] });
    await request(app.getHttpServer()).get('/api/v1/admin/ping').set('Authorization', `Bearer ${agentToken}`).expect(403);
    const adminToken = await jwt.signAsync({ sub: 'admin-1', roles: ['ADMIN'] });
    await request(app.getHttpServer()).get('/api/v1/admin/ping').set('Authorization', `Bearer ${adminToken}`).expect(200).expect({ status: 'ok' });
  });

  it('returns access token in JSON and the refresh token only in an HttpOnly cookie', async () => {
    authMock.login.mockResolvedValue({
      accessToken: 'short-access-token', refreshToken: 'opaque-refresh-token',
      user: { id: 'admin-1', email: 'admin@example.test', roles: ['ADMIN'] },
    });
    const response = await request(app.getHttpServer()).post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: 'admin@example.test', password: 'valid-password' })
      .expect(201);
    expect(response.body).toEqual({ accessToken: 'short-access-token', user: { id: 'admin-1', email: 'admin@example.test', roles: ['ADMIN'] } });
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(response.headers['set-cookie'][0]).toContain('Path=/api/v1/auth');
    expect(JSON.stringify(response.body)).not.toContain('opaque-refresh-token');
  });

  it('rejects a login request from an unconfigured origin or with extra DTO fields', async () => {
    await request(app.getHttpServer()).post('/api/v1/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ email: 'admin@example.test', password: 'valid-password' })
      .expect(401);
    await request(app.getHttpServer()).post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: 'admin@example.test', password: 'valid-password', role: 'ADMIN' })
      .expect(400);
  });
});
