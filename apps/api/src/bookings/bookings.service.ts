import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { AppEnv } from '../config/env.js';
import { APP_ENV } from '../config/env.token.js';
import type { CreateBookingDto } from './booking.dto.js';
import type { AdminBookingQueryDto } from './admin-booking-query.dto.js';
import { calculateDueIdr } from './booking-pricing.js';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService, @Inject(APP_ENV) private readonly env: AppEnv) {}

  async create(input: CreateBookingDto) {
    const participantCount = input.participants.length;
    const email = input.email.trim().toLowerCase();
    const phone = input.phone.trim();
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "TripSchedule" WHERE "id" = ${input.scheduleId} FOR UPDATE`;
      if (!locked.length) throw new NotFoundException('Jadwal tidak ditemukan.');
      const schedule = await tx.tripSchedule.findUnique({ where: { id: input.scheduleId }, include: { trip: { select: { status: true, name: true } } } });
      if (!schedule || !schedule.isActive || schedule.trip.status !== 'PUBLISHED' || schedule.departureAt <= now) throw new ConflictException('Jadwal tidak tersedia untuk booking.');
      if (schedule.capacity - schedule.heldSeats - schedule.soldSeats < participantCount) throw new ConflictException('Kursi yang tersedia tidak mencukupi.');

      const totalPriceIdr = schedule.priceIdr * participantCount;
      if (!Number.isSafeInteger(totalPriceIdr)) throw new ConflictException('Total harga di luar batas yang didukung.');
      const amountDueIdr = calculateDueIdr(totalPriceIdr, schedule.departureAt, now, this.env.DOWN_PAYMENT_PERCENT);
      const holdExpiresAt = new Date(Math.min(now.getTime() + this.env.BOOKING_HOLD_MINUTES * 60_000, schedule.departureAt.getTime()));
      const booking = await tx.booking.create({
        data: {
          code: randomBytes(12).toString('base64url').toUpperCase(), scheduleId: schedule.id,
          bookerName: input.bookerName.trim(), email, phone,
          contactVerificationHash: this.hashContact(email, phone), status: 'PENDING_DP', participantCount,
          unitPriceIdr: schedule.priceIdr, totalPriceIdr, amountDueIdr, holdExpiresAt,
          participants: { create: input.participants.map(({ fullName }) => ({ fullName: fullName.trim() })) },
        },
        select: { id: true, code: true, status: true, participantCount: true, totalPriceIdr: true, amountDueIdr: true, holdExpiresAt: true },
      });
      await tx.tripSchedule.update({ where: { id: schedule.id }, data: { heldSeats: { increment: participantCount } } });
      await tx.auditLog.create({ data: { action: 'CREATE', entityType: 'BOOKING', entityId: booking.id, afterData: { status: booking.status, participantCount, totalPriceIdr, amountDueIdr } } });
      return {
        code: booking.code, status: booking.status, participantCount: booking.participantCount,
        totalPriceIdr: booking.totalPriceIdr, amountDueIdr: booking.amountDueIdr,
        holdExpiresAt: booking.holdExpiresAt, tripName: schedule.trip.name, departureAt: schedule.departureAt,
      };
    });
  }

  async status(code: string, email: string, phone: string) {
    const booking = await this.prisma.booking.findUnique({ where: { code }, include: { schedule: { include: { trip: { select: { name: true } } } } } });
    if (!booking || !this.matchesContact(booking.contactVerificationHash, email, phone)) throw new NotFoundException('Booking tidak ditemukan.');
    return {
      code: booking.code, status: booking.status, participantCount: booking.participantCount,
      totalPriceIdr: booking.totalPriceIdr, amountDueIdr: booking.amountDueIdr,
      holdExpiresAt: booking.holdExpiresAt, tripName: booking.schedule.trip.name,
      departureAt: booking.schedule.departureAt,
    };
  }

  async cancel(code: string, email: string, phone: string) {
    return this.prisma.$transaction(async (tx) => {
      const reference = await tx.booking.findUnique({ where: { code }, select: { id: true, scheduleId: true } });
      if (!reference) throw new NotFoundException('Booking tidak ditemukan.');
      await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "TripSchedule" WHERE "id" = ${reference.scheduleId} FOR UPDATE`;
      const booking = await tx.booking.findUnique({ where: { code } });
      if (!booking || !this.matchesContact(booking.contactVerificationHash, email, phone)) throw new NotFoundException('Booking tidak ditemukan.');
      if (booking.status !== 'PENDING_DP' || booking.holdExpiresAt <= new Date()) throw new ConflictException('Booking tidak dapat dibatalkan pada status ini.');
      const updated = await tx.booking.updateMany({ where: { id: booking.id, status: 'PENDING_DP', holdExpiresAt: { gt: new Date() } }, data: { status: 'CANCELLED' } });
      if (updated.count !== 1) throw new ConflictException('Booking sudah berubah. Silakan muat ulang statusnya.');
      await tx.tripSchedule.update({ where: { id: booking.scheduleId }, data: { heldSeats: { decrement: booking.participantCount } } });
      await tx.auditLog.create({ data: { action: 'CANCEL', entityType: 'BOOKING', entityId: booking.id, beforeData: { status: 'PENDING_DP' }, afterData: { status: 'CANCELLED', participantCount: booking.participantCount } } });
      return { status: 'CANCELLED' as const };
    });
  }

  async expireDue() {
    const now = new Date();
    const due = await this.prisma.booking.findMany({ where: { status: 'PENDING_DP', holdExpiresAt: { lte: now } }, select: { code: true }, orderBy: { holdExpiresAt: 'asc' }, take: 100 });
    let expired = 0;
    for (const booking of due) if (await this.expireOne(booking.code, now)) expired++;
    return expired;
  }

  async listAdmin(query: AdminBookingQueryDto) {
    const rows = await this.prisma.booking.findMany({
      where: query.status ? { status: query.status } : undefined,
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, code: true, bookerName: true, email: true, phone: true, status: true,
        participantCount: true, totalPriceIdr: true, amountDueIdr: true, holdExpiresAt: true, createdAt: true,
        schedule: { select: { departureAt: true, trip: { select: { name: true } } } },
        participants: { select: { fullName: true } },
      },
    });
    const hasMore = rows.length > query.limit;
    const items = rows.slice(0, query.limit);
    return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  private async expireOne(code: string, now: Date) {
    return this.prisma.$transaction(async (tx) => {
      const reference = await tx.booking.findUnique({ where: { code }, select: { id: true, scheduleId: true } });
      if (!reference) return false;
      await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "TripSchedule" WHERE "id" = ${reference.scheduleId} FOR UPDATE`;
      const booking = await tx.booking.findUnique({ where: { id: reference.id }, select: { id: true, scheduleId: true, status: true, participantCount: true, holdExpiresAt: true } });
      if (!booking || booking.status !== 'PENDING_DP' || booking.holdExpiresAt > now) return false;
      const changed = await tx.booking.updateMany({ where: { id: booking.id, status: 'PENDING_DP', holdExpiresAt: { lte: now } }, data: { status: 'EXPIRED' } });
      if (changed.count !== 1) return false;
      await tx.tripSchedule.update({ where: { id: booking.scheduleId }, data: { heldSeats: { decrement: booking.participantCount } } });
      await tx.auditLog.create({ data: { action: 'EXPIRE', entityType: 'BOOKING', entityId: booking.id, beforeData: { status: 'PENDING_DP' }, afterData: { status: 'EXPIRED', participantCount: booking.participantCount } } });
      return true;
    });
  }

  private hashContact(email: string, phone: string) {
    return createHmac('sha256', this.env.JWT_ACCESS_SECRET).update(`${email}\0${phone}`).digest('hex');
  }

  private matchesContact(storedHash: string, email: string, phone: string) {
    const candidate = Buffer.from(this.hashContact(email.trim().toLowerCase(), phone.trim()), 'hex');
    const stored = Buffer.from(storedHash, 'hex');
    return stored.length === candidate.length && timingSafeEqual(stored, candidate);
  }
}
