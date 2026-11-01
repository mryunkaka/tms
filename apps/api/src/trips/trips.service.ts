import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { buildDestinationTree } from '../destinations/destinations.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { CreateTripDto } from './trip.dto.js';
import type { TripQueryDto } from './trip-query.dto.js';

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  async createDraft(input: CreateTripDto, actorId: string) {
    const destinationIds = input.destinations.map(({ destinationId }) => destinationId);
    const positions = input.destinations.map(({ position }) => position);
    if (new Set(destinationIds).size !== destinationIds.length || new Set(positions).size !== positions.length || input.destinations.filter(({ isPrimary }) => isPrimary).length !== 1) {
      throw new BadRequestException('Setiap destinasi harus unik, berurutan, dan memiliki tepat satu lokasi utama.');
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const found = await tx.destination.findMany({ where: { id: { in: destinationIds } }, select: { id: true } });
        if (found.length !== destinationIds.length) throw new NotFoundException('Satu atau lebih destinasi tidak ditemukan.');
        const trip = await tx.trip.create({
          data: {
            slug: input.slug, name: input.name, summary: input.summary, durationDays: input.durationDays,
            itinerary: input.itinerary.map((day) => ({ day: day.day, title: day.title, ...(day.description ? { description: day.description } : {}) })), inclusions: input.inclusions, exclusions: input.exclusions,
            meetingPoint: input.meetingPoint, terms: input.terms, cancellationPolicy: input.cancellationPolicy,
            status: 'DRAFT',
            destinations: { create: input.destinations.map(({ destinationId, position, isPrimary }) => ({ destination: { connect: { id: destinationId } }, position, isPrimary })) },
          },
          include: { destinations: true },
        });
        await tx.auditLog.create({ data: { actorId, action: 'CREATE', entityType: 'TRIP', entityId: trip.id, afterData: { slug: trip.slug, name: trip.name, status: trip.status, destinations: input.destinations.map(({ destinationId, position, isPrimary }) => ({ destinationId, position, isPrimary })) } as Prisma.InputJsonValue } });
        return trip;
      });
    } catch (error) {
      if (this.isUniqueError(error)) throw new ConflictException('Slug trip sudah digunakan.');
      throw error;
    }
  }

  async listPublic(query: TripQueryDto) {
    if (query.minDuration && query.maxDuration && query.minDuration > query.maxDuration) throw new BadRequestException('Rentang durasi tidak valid.');
    if (query.minPrice !== undefined && query.maxPrice !== undefined && query.minPrice > query.maxPrice) throw new BadRequestException('Rentang harga tidak valid.');
    const from = query.from ? new Date(query.from) : new Date();
    const to = query.to ? new Date(query.to) : undefined;
    if (to && from > to) throw new BadRequestException('Rentang tanggal tidak valid.');

    const rows = await this.prisma.destination.findMany({ where: { isActive: true }, select: { id: true, parentId: true, slug: true, name: true } });
    const tree = buildDestinationTree(rows);
    const collect = (nodes: ReturnType<typeof buildDestinationTree>): string[] => nodes.flatMap((node) => [node.id, ...collect(node.children)]);
    const visibleIds = new Set(collect(tree));
    let destinationIds = [...visibleIds];
    if (query.destination) {
      const target = rows.find((row) => row.slug === query.destination);
      if (!target || !visibleIds.has(target.id)) return [];
      const descendants = new Map<string, string[]>();
      for (const row of rows) if (row.parentId && visibleIds.has(row.id)) descendants.set(row.parentId, [...(descendants.get(row.parentId) ?? []), row.id]);
      destinationIds = [target.id];
      for (let i = 0; i < destinationIds.length; i++) destinationIds.push(...(descendants.get(destinationIds[i]) ?? []));
    }
    if (!destinationIds.length) return [];

    const departureAt = { gte: from, ...(to ? { lte: to } : {}) };
    const priceIdr = { ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}), ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}) };
    const scheduleWhere = { isActive: true, departureAt, ...(Object.keys(priceIdr).length ? { priceIdr } : {}) };
    const trips = await this.prisma.trip.findMany({
      where: {
        status: 'PUBLISHED',
        ...(query.minDuration || query.maxDuration ? { durationDays: { ...(query.minDuration ? { gte: query.minDuration } : {}), ...(query.maxDuration ? { lte: query.maxDuration } : {}) } } : {}),
        destinations: { some: { destination: { id: { in: destinationIds } } } },
        schedules: { some: scheduleWhere },
      },
      include: {
        destinations: { where: { destinationId: { in: [...visibleIds] } }, include: { destination: { select: { slug: true, name: true } } }, orderBy: { position: 'asc' } },
        schedules: { where: scheduleWhere, orderBy: { departureAt: 'asc' } },
      },
      orderBy: { name: 'asc' },
    });
    return trips.map((trip) => ({
      id: trip.id, slug: trip.slug, name: trip.name, summary: trip.summary, durationDays: trip.durationDays,
      destinations: trip.destinations.map(({ destination, position, isPrimary }) => ({ ...destination, position, isPrimary })),
      schedules: trip.schedules.map(({ heldSeats, soldSeats, capacity, ...schedule }) => ({ ...schedule, availableSeats: capacity - heldSeats - soldSeats })).filter((schedule) => schedule.availableSeats > 0),
    })).filter((trip) => trip.schedules.length > 0);
  }

  private isUniqueError(error: unknown): error is { code: string } {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
