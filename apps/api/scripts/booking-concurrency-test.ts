import { config } from 'dotenv';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PrismaService } from '../src/database/prisma.service.js';
import { loadEnv } from '../src/config/env.js';
import { BookingsService } from '../src/bookings/bookings.service.js';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

const prisma = new PrismaService();
const env = loadEnv();
const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
let destinationId: string | undefined;
let tripId: string | undefined;
let scheduleId: string | undefined;

try {
  await prisma.$connect();
  const destination = await prisma.destination.create({ data: { slug: `test-${suffix}`, name: `TEST ${suffix}`, isActive: true } });
  destinationId = destination.id;
  const trip = await prisma.trip.create({
    data: {
      slug: `test-${suffix}`, name: `TEST ${suffix}`, summary: 'TEST', durationDays: 1,
      itinerary: [{ day: 1, title: 'TEST' }], inclusions: [], exclusions: [], meetingPoint: 'TEST', terms: 'TEST', cancellationPolicy: 'TEST', status: 'PUBLISHED',
      destinations: { create: { destination: { connect: { id: destination.id } }, position: 0, isPrimary: true } },
    },
  });
  tripId = trip.id;
  const schedule = await prisma.tripSchedule.create({ data: { tripId: trip.id, departureAt: new Date(Date.now() + 30 * 86_400_000), capacity: 1, priceIdr: 10_000, minimumPax: 1, isActive: true } });
  scheduleId = schedule.id;
  const bookings = new BookingsService(prisma, env);
  const attempts = await Promise.allSettled([1, 2].map((n) => bookings.create({
    scheduleId: schedule.id, bookerName: `TEST ${n}`, email: `test-${n}-${suffix}@example.test`, phone: `+6281234567${n}`,
    participants: [{ fullName: `TEST ${n}` }],
  })));
  const succeeded = attempts.filter((attempt) => attempt.status === 'fulfilled').length;
  const scheduleAfter = await prisma.tripSchedule.findUniqueOrThrow({ where: { id: schedule.id } });
  const createdBookings = await prisma.booking.findMany({ where: { scheduleId: schedule.id }, select: { id: true } });
  if (succeeded !== 1 || scheduleAfter.heldSeats !== 1 || createdBookings.length !== 1) {
    throw new Error(`Concurrency check failed: successes=${succeeded}, held=${scheduleAfter.heldSeats}, bookings=${createdBookings.length}.`);
  }
  await prisma.booking.update({ where: { id: createdBookings[0].id }, data: { holdExpiresAt: new Date(Date.now() - 1000) } });
  const expired = await bookings.expireDue();
  const expiredAgain = await bookings.expireDue();
  const scheduleAfterExpiry = await prisma.tripSchedule.findUniqueOrThrow({ where: { id: schedule.id } });
  const bookingAfterExpiry = await prisma.booking.findUniqueOrThrow({ where: { id: createdBookings[0].id }, select: { status: true } });
  if (expired !== 1 || expiredAgain !== 0 || scheduleAfterExpiry.heldSeats !== 0 || bookingAfterExpiry.status !== 'EXPIRED') {
    throw new Error(`Expiry check failed: expired=${expired}, repeated=${expiredAgain}, held=${scheduleAfterExpiry.heldSeats}, status=${bookingAfterExpiry.status}.`);
  }
  process.stdout.write('PostgreSQL booking checks passed: one seat produced one booking; hold expiry released it exactly once.\n');
} finally {
  if (scheduleId) {
    const bookings = await prisma.booking.findMany({ where: { scheduleId }, select: { id: true } });
    await prisma.auditLog.deleteMany({ where: { entityType: 'BOOKING', entityId: { in: bookings.map(({ id }) => id) } } });
    await prisma.booking.deleteMany({ where: { scheduleId } });
    await prisma.tripSchedule.deleteMany({ where: { id: scheduleId } });
  }
  if (tripId) await prisma.trip.deleteMany({ where: { id: tripId } });
  if (destinationId) await prisma.destination.deleteMany({ where: { id: destinationId } });
  await prisma.$disconnect();
}
