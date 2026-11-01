import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { TripsService } from './trips.service.js';

describe('TripsService admin lifecycle', () => {
  const tx = {
    destination: { findMany: jest.fn<(...args: unknown[]) => Promise<unknown[]>>().mockResolvedValue([{ id: 'destination-1' }]) },
    trip: {
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({ id: 'trip-1', status: 'DRAFT', durationDays: 1, itinerary: [{ day: 1, title: 'TBD' }], destinations: [{ isPrimary: true, destination: { id: 'destination-1', isActive: true } }] }),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({ id: 'trip-1', status: 'PUBLISHED' }),
    },
    tripSchedule: {
      count: jest.fn<(...args: unknown[]) => Promise<number>>().mockResolvedValue(0),
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({ id: 'schedule-1', isActive: false }),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    tripDestination: { deleteMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(), createMany: jest.fn<(...args: unknown[]) => Promise<unknown>>() },
    auditLog: { create: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({}) },
  };
  const prisma = { ...tx, $transaction: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockImplementation(async (...args) => (args[0] as (transaction: typeof tx) => Promise<unknown>)(tx)) };
  let service: TripsService;

  beforeEach(() => { jest.clearAllMocks(); service = new TripsService(prisma as never); });

  it('requires an active future schedule before publishing', async () => {
    await expect(service.update('trip-1', { status: 'PUBLISHED' }, 'admin-1')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.tripSchedule.count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tripId: 'trip-1', isActive: true, departureAt: { gt: expect.any(Date) } }) }));
  });

  it('refuses to publish a trip with missing itinerary days', async () => {
    tx.trip.findUnique.mockResolvedValue({ id: 'trip-1', status: 'DRAFT', durationDays: 2, itinerary: [{ day: 1, title: 'TBD' }], destinations: [{ isPrimary: true, destination: { id: 'destination-1', isActive: true } }] });
    tx.destination.findMany.mockResolvedValue([{ id: 'destination-1' }]);
    tx.tripSchedule.count.mockResolvedValue(1);
    await expect(service.update('trip-1', { status: 'PUBLISHED' }, 'admin-1')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.trip.update).not.toHaveBeenCalled();
  });

  it('creates schedules inactive for draft trips', async () => {
    tx.trip.findUnique.mockResolvedValue({ id: 'trip-1', status: 'DRAFT' });
    await expect(service.createSchedule('trip-1', { departureAt: new Date(Date.now() + 86_400_000).toISOString(), capacity: 10, priceIdr: 20_000, minimumPax: 2 }, 'admin-1')).resolves.toMatchObject({ id: 'schedule-1', isActive: false });
    expect(tx.tripSchedule.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tripId: 'trip-1', isActive: false }) }));
  });

  it('refuses a capacity reduction below seats already held or sold', async () => {
    tx.tripSchedule.findUnique.mockResolvedValue({ id: 'schedule-1', tripId: 'trip-1', departureAt: new Date(Date.now() + 86_400_000), capacity: 3, heldSeats: 2, soldSeats: 0, isActive: false, trip: { status: 'DRAFT' } });
    await expect(service.updateSchedule('schedule-1', { capacity: 1 }, 'admin-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows an active future schedule on a draft trip so it can be published afterward', async () => {
    tx.tripSchedule.findUnique.mockResolvedValue({ id: 'schedule-1', tripId: 'trip-1', departureAt: new Date(Date.now() + 86_400_000), capacity: 3, heldSeats: 0, soldSeats: 0, isActive: false, trip: { status: 'DRAFT' } });
    tx.tripSchedule.update.mockResolvedValue({ id: 'schedule-1', isActive: true });
    await expect(service.updateSchedule('schedule-1', { isActive: true }, 'admin-1')).resolves.toMatchObject({ isActive: true });
  });
});
