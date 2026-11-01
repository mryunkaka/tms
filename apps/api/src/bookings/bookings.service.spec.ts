import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createHmac } from 'node:crypto';
import { NotFoundException } from '@nestjs/common';
import { BookingsService } from './bookings.service.js';

describe('BookingsService', () => {
  const schedule = {
    id: 'schedule-1', departureAt: new Date(Date.now() + 30 * 86_400_000), capacity: 3, heldSeats: 0, soldSeats: 0,
    priceIdr: 10_001, isActive: true, trip: { status: 'PUBLISHED', name: 'Trip TEST' },
  };
  const tx = {
    $queryRaw: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue([{ id: 'schedule-1' }]),
    tripSchedule: {
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(schedule),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({}),
    },
    booking: {
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockImplementation(async (...args) => ({ id: 'booking-1', code: 'CODE', ...(args[0] as { data: object }).data as object })),
      findMany: jest.fn<(...args: unknown[]) => Promise<unknown[]>>().mockResolvedValue([{ code: 'EXPIRED-CODE' }]),
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      updateMany: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({ count: 1 }),
    },
    auditLog: { create: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({}) },
  };
  const prisma = {
    ...tx,
    $transaction: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockImplementation(async (...args) => (args[0] as (transaction: typeof tx) => Promise<unknown>)(tx)),
  };
  const env = { BOOKING_HOLD_MINUTES: 120, DOWN_PAYMENT_PERCENT: 30, JWT_ACCESS_SECRET: 'a-booking-lookup-test-secret' } as never;
  let service: BookingsService;

  beforeEach(() => { jest.clearAllMocks(); service = new BookingsService(prisma as never, env); });

  it('locks the schedule and snapshots price before placing a DP hold', async () => {
    const result = await service.create({
      scheduleId: 'schedule-1', bookerName: 'Rina TEST', email: 'rina@example.test', phone: '+62812345678',
      participants: [{ fullName: 'Rina TEST' }],
    });
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.tripSchedule.update).toHaveBeenCalledWith({ where: { id: 'schedule-1' }, data: { heldSeats: { increment: 1 } } });
    expect(tx.booking.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ totalPriceIdr: 10_001, amountDueIdr: 3_001, status: 'PENDING_DP' }) }));
    expect(result).toMatchObject({ status: 'PENDING_DP', totalPriceIdr: 10_001, amountDueIdr: 3_001 });
    expect(JSON.stringify(result)).not.toContain('rina@example.test');
  });

  it('cancels a pending booking and returns its hold exactly once', async () => {
    const email = 'rina@example.test';
    const phone = '+62812345678';
    const contactVerificationHash = createHmac('sha256', 'a-booking-lookup-test-secret').update(`${email}\0${phone}`).digest('hex');
    tx.booking.findUnique.mockResolvedValue({ id: 'booking-1', code: 'CODE', status: 'PENDING_DP', participantCount: 1, holdExpiresAt: new Date(Date.now() + 60_000), contactVerificationHash, scheduleId: 'schedule-1' });
    await expect(service.cancel('CODE', email, phone)).resolves.toEqual({ status: 'CANCELLED' });
    expect(tx.booking.updateMany).toHaveBeenCalledWith({ where: { id: 'booking-1', status: 'PENDING_DP', holdExpiresAt: { gt: expect.any(Date) } }, data: { status: 'CANCELLED' } });
    expect(tx.tripSchedule.update).toHaveBeenCalledWith({ where: { id: 'schedule-1' }, data: { heldSeats: { decrement: 1 } } });
  });

  it('returns only minimal status details when the contact factor matches', async () => {
    const email = 'rina@example.test';
    const phone = '+62812345678';
    const contactVerificationHash = createHmac('sha256', 'a-booking-lookup-test-secret').update(`${email}\0${phone}`).digest('hex');
    tx.booking.findUnique.mockResolvedValue({
      code: 'CODE', status: 'PENDING_DP', participantCount: 1, totalPriceIdr: 10_001, amountDueIdr: 3_001,
      holdExpiresAt: new Date(), contactVerificationHash, email, phone,
      schedule: { departureAt: new Date(), trip: { name: 'Trip TEST' } },
    });
    const result = await service.status('CODE', email, phone);
    expect(result).toMatchObject({ code: 'CODE', status: 'PENDING_DP', tripName: 'Trip TEST' });
    expect(JSON.stringify(result)).not.toContain(email);
    await expect(service.status('CODE', 'other@example.test', phone)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('expires overdue holds and releases their seats in the same transaction', async () => {
    tx.booking.findUnique.mockResolvedValue({ id: 'booking-1', code: 'EXPIRED-CODE', status: 'PENDING_DP', participantCount: 1, holdExpiresAt: new Date(Date.now() - 1000), scheduleId: 'schedule-1' });
    await expect(service.expireDue()).resolves.toBe(1);
    expect(tx.booking.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'booking-1', status: 'PENDING_DP', holdExpiresAt: { lte: expect.any(Date) } }, data: { status: 'EXPIRED' } }));
    expect(tx.tripSchedule.update).toHaveBeenCalledWith({ where: { id: 'schedule-1' }, data: { heldSeats: { decrement: 1 } } });
  });
});
