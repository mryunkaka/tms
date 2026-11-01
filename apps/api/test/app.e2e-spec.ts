import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from '../src/database/prisma.service.js';
import { AuthService } from '../src/auth/auth.service.js';
import { BookingsService } from '../src/bookings/bookings.service.js';
import { BookingExpiryScheduler } from '../src/bookings/booking-expiry.scheduler.js';

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
  const bookingsMock = {
    create: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({ code: '0123456789ABCDEF', status: 'PENDING_DP', totalPriceIdr: 10_000 }),
    status: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({ code: '0123456789ABCDEF', status: 'PENDING_DP', totalPriceIdr: 10_000 }),
    cancel: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({ status: 'CANCELLED' }),
    expireDue: jest.fn<(...args: unknown[]) => Promise<number>>().mockResolvedValue(0),
    listAdmin: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({ items: [], nextCursor: null }),
  };
  const destinationMock = {
      findMany: jest.fn<(...args: unknown[]) => Promise<unknown[]>>().mockResolvedValue([
        { id: 'destination-1', parentId: null, slug: 'wilayah-test', name: 'Wilayah TEST' },
        { id: 'destination-2', parentId: 'destination-1', slug: 'lokasi-test', name: 'Lokasi TEST' },
      ]),
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({ id: 'destination-parent' }),
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockImplementation(async (...args) => ({ id: 'destination-new', ...((args[0] as { data: object }).data) })),
  };
  const tripMock = {
    findMany: jest.fn<(...args: unknown[]) => Promise<unknown[]>>().mockResolvedValue([]),
    findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(null),
    create: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({ id: 'trip-new', slug: 'trip-test', name: 'Trip TEST', status: 'DRAFT' }),
  };
  const scheduleMock = {
    create: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({ id: 'schedule-new', isActive: false }),
    findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };
  const prismaTxMock = {
    destination: destinationMock,
    trip: tripMock,
    tripSchedule: scheduleMock,
    tripDestination: { findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(null) },
    auditLog: { create: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({}) },
  };
  const prismaMock = {
    ...prismaTxMock,
    $transaction: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockImplementation(async (...args) => (args[0] as (tx: unknown) => Promise<unknown>)(prismaTxMock)),
  };

  beforeAll(async () => {
    const { AppModule } = await import('../src/app.module.js');
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService).useValue(prismaMock)
      .overrideProvider(AuthService).useValue(authMock)
      .overrideProvider(BookingsService).useValue(bookingsMock)
      .overrideProvider(BookingExpiryScheduler).useValue({})
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => { if (app) await app.close(); });

  it('returns a healthy response', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200).expect({ status: 'ok' });
  });

  it('returns the active destination tree without authentication', async () => {
    await request(app.getHttpServer()).get('/api/v1/destinations').expect(200).expect([
      { id: 'destination-1', slug: 'wilayah-test', name: 'Wilayah TEST', children: [
        { id: 'destination-2', slug: 'lokasi-test', name: 'Lokasi TEST', children: [] },
      ] },
    ]);
    expect(prismaMock.destination.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: true } }));
  });

  it('protects destination management and creates drafts for admins', async () => {
    const payload = { slug: 'kotabaru', name: 'Kotabaru' };
    await request(app.getHttpServer()).post('/api/v1/admin/destinations').send(payload).expect(401);
    const jwt = app.get(JwtService);
    const adminToken = await jwt.signAsync({ sub: 'admin-1', roles: ['ADMIN'] });
    await request(app.getHttpServer()).post('/api/v1/admin/destinations')
      .set('Authorization', `Bearer ${adminToken}`).send(payload).expect(201)
      .expect({ id: 'destination-new', slug: 'kotabaru', name: 'Kotabaru', isActive: false });
  });

  it('lists only published trips and validates public search filters', async () => {
    await request(app.getHttpServer()).get('/api/v1/trips?minDuration=3&minPrice=100000').expect(200).expect([]);
    expect(tripMock.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: 'PUBLISHED', durationDays: { gte: 3 },
        destinations: { some: { destination: { id: { in: ['destination-1', 'destination-2'] } } } },
      }),
    }));
    await request(app.getHttpServer()).get('/api/v1/trips?minDuration=0').expect(400);
  });

  it('keeps unpublished or missing trip details unavailable to the public', async () => {
    await request(app.getHttpServer()).get('/api/v1/trips/draft-test').expect(404);
    expect(tripMock.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { slug: 'draft-test', status: 'PUBLISHED' } }));
  });

  it('allows only admins to create a trip draft', async () => {
    destinationMock.findMany.mockResolvedValue([{ id: 'destination-parent' }]);
    const payload = { slug: 'trip-test', name: 'Trip TEST', summary: 'TBD', durationDays: 2, itinerary: [{ day: 1, title: 'TBD' }], inclusions: [], exclusions: [], meetingPoint: 'TBD', terms: 'TBD', cancellationPolicy: 'TBD', destinations: [{ destinationId: 'destination-parent', position: 0, isPrimary: true }] };
    await request(app.getHttpServer()).post('/api/v1/admin/trips').send(payload).expect(401);
    const jwt = app.get(JwtService);
    const adminToken = await jwt.signAsync({ sub: 'admin-1', roles: ['ADMIN'] });
    await request(app.getHttpServer()).post('/api/v1/admin/trips')
      .set('Authorization', `Bearer ${adminToken}`).send(payload).expect(201)
      .expect({ id: 'trip-new', slug: 'trip-test', name: 'Trip TEST', status: 'DRAFT' });
  });

  it('protects schedule creation and keeps new schedules inactive', async () => {
    tripMock.findUnique.mockResolvedValue({ id: 'trip-draft', status: 'DRAFT' });
    const payload = { tripId: 'trip-draft', departureAt: new Date(Date.now() + 86_400_000).toISOString(), capacity: 10, priceIdr: 20_000, minimumPax: 2 };
    await request(app.getHttpServer()).post('/api/v1/admin/schedules').send(payload).expect(401);
    const jwt = app.get(JwtService);
    const adminToken = await jwt.signAsync({ sub: 'admin-1', roles: ['ADMIN'] });
    await request(app.getHttpServer()).post('/api/v1/admin/schedules').set('Authorization', `Bearer ${adminToken}`).send(payload).expect(201).expect({ id: 'schedule-new', isActive: false });
  });

  it('allows guest booking and puts status lookup contact details in the request body', async () => {
    const payload = { scheduleId: 'schedule-test', bookerName: 'Rina TEST', email: 'rina@example.test', phone: '+62812345678', participants: [{ fullName: 'Rina TEST' }] };
    await request(app.getHttpServer()).post('/api/v1/bookings').set('Origin', 'http://localhost:3000').send(payload).expect(201).expect({ code: '0123456789ABCDEF', status: 'PENDING_DP', totalPriceIdr: 10_000 });
    await request(app.getHttpServer()).post('/api/v1/bookings/lookup').set('Origin', 'http://localhost:3000').send({ code: '0123456789ABCDEF', email: payload.email, phone: payload.phone }).expect(201);
    expect(bookingsMock.status).toHaveBeenCalledWith('0123456789ABCDEF', payload.email, payload.phone);
    await request(app.getHttpServer()).post('/api/v1/bookings/lookup').set('Origin', 'http://localhost:3000').send({ code: '0123456789ABCDEF', email: payload.email, phone: payload.phone, extra: 'reject' }).expect(400);
  });

  it('restricts booking records to admins', async () => {
    await request(app.getHttpServer()).get('/api/v1/admin/bookings').expect(401);
    const jwt = app.get(JwtService);
    const adminToken = await jwt.signAsync({ sub: 'admin-1', roles: ['ADMIN'] });
    await request(app.getHttpServer()).get('/api/v1/admin/bookings').set('Authorization', `Bearer ${adminToken}`).expect(200).expect({ items: [], nextCursor: null });
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
