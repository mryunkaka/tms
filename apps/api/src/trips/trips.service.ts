import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { buildDestinationTree } from '../destinations/destinations.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { CreateTripDto, CreateTripScheduleDto, UpdateTripDto, UpdateTripScheduleDto } from './trip.dto.js';
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

  async listAdmin() {
    return this.prisma.trip.findMany({ include: { destinations: { include: { destination: true }, orderBy: { position: 'asc' } }, schedules: { orderBy: { departureAt: 'asc' } } }, orderBy: { updatedAt: 'desc' } });
  }

  async createSchedule(tripId: string, input: Omit<CreateTripScheduleDto, 'tripId'>, actorId: string) {
    const departureAt = new Date(input.departureAt);
    if (departureAt <= new Date()) throw new BadRequestException('Tanggal keberangkatan harus di masa depan.');
    return this.prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id: tripId }, select: { id: true, status: true } });
      if (!trip) throw new NotFoundException('Trip tidak ditemukan.');
      if (trip.status === 'ARCHIVED') throw new ConflictException('Trip yang diarsipkan tidak menerima jadwal baru.');
      const schedule = await tx.tripSchedule.create({ data: { tripId, departureAt, capacity: input.capacity, priceIdr: input.priceIdr, minimumPax: input.minimumPax, isActive: false } });
      await tx.auditLog.create({ data: { actorId, action: 'CREATE', entityType: 'TRIP_SCHEDULE', entityId: schedule.id, afterData: { tripId, departureAt, capacity: input.capacity, priceIdr: input.priceIdr, minimumPax: input.minimumPax, isActive: false } } });
      return schedule;
    });
  }

  async updateSchedule(id: string, input: UpdateTripScheduleDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.tripSchedule.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Jadwal tidak ditemukan.');
      const departureAt = input.departureAt ? new Date(input.departureAt) : current.departureAt;
      if (departureAt <= new Date()) throw new BadRequestException('Tanggal keberangkatan harus di masa depan.');
      if (input.capacity !== undefined && input.capacity < current.heldSeats + current.soldSeats) throw new ConflictException('Kapasitas tidak boleh di bawah kursi yang sudah dipesan.');
      if (input.departureAt && current.heldSeats + current.soldSeats > 0) throw new ConflictException('Jadwal dengan booking tidak dapat diubah sebelum peserta ditangani admin.');
      const updated = await tx.tripSchedule.update({ where: { id }, data: { ...input, ...(input.departureAt ? { departureAt } : {}) } });
      await tx.auditLog.create({ data: { actorId, action: 'UPDATE', entityType: 'TRIP_SCHEDULE', entityId: id, beforeData: { departureAt: current.departureAt, capacity: current.capacity, priceIdr: current.priceIdr, minimumPax: current.minimumPax, isActive: current.isActive }, afterData: { departureAt: updated.departureAt, capacity: updated.capacity, priceIdr: updated.priceIdr, minimumPax: updated.minimumPax, isActive: updated.isActive } } });
      return updated;
    });
  }

  async update(id: string, input: UpdateTripDto, actorId: string) {
    if (input.destinations) this.validateDestinationLinks(input.destinations);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const current = await tx.trip.findUnique({
          where: { id },
          include: { destinations: { include: { destination: { select: { id: true, isActive: true } } } } },
        });
        if (!current) throw new NotFoundException('Trip tidak ditemukan.');
        const links = input.destinations ?? current.destinations.map(({ destinationId, position, isPrimary }) => ({ destinationId, position, isPrimary }));
        const nextStatus = input.status ?? current.status;
        if (nextStatus === 'PUBLISHED') {
          const durationDays = input.durationDays ?? current.durationDays;
          const itinerary = input.itinerary ?? current.itinerary;
          if (!this.hasCompleteItinerary(itinerary, durationDays)) throw new ConflictException('Itinerary harus memuat judul untuk setiap hari perjalanan sebelum trip diterbitkan.');
          this.validateDestinationLinks(links);
          const activeDestinations = await tx.destination.findMany({ where: { id: { in: links.map(({ destinationId }) => destinationId) }, isActive: true }, select: { id: true } });
          if (activeDestinations.length !== links.length) throw new ConflictException('Semua destinasi harus aktif sebelum trip diterbitkan.');
          const activeSchedules = await tx.tripSchedule.count({ where: { tripId: id, isActive: true, departureAt: { gt: new Date() } } });
          if (!activeSchedules) throw new ConflictException('Trip memerlukan jadwal aktif mendatang sebelum diterbitkan.');
        }
        if (nextStatus === 'ARCHIVED') {
          const occupied = await tx.tripSchedule.findFirst({ where: { tripId: id, OR: [{ heldSeats: { gt: 0 } }, { soldSeats: { gt: 0 } }] }, select: { id: true } });
          if (occupied) throw new ConflictException('Trip dengan booking aktif tidak dapat diarsipkan.');
        }
        const { destinations, itinerary, ...fields } = input;
        const updated = await tx.trip.update({ where: { id }, data: {
          ...fields,
          ...(itinerary ? { itinerary: itinerary.map(({ day, title, description }) => ({ day, title, ...(description ? { description } : {}) })) } : {}),
        } });
        if (destinations) {
          await tx.tripDestination.deleteMany({ where: { tripId: id } });
          await tx.tripDestination.createMany({ data: destinations.map((link) => ({ ...link, tripId: id })) });
        }
        await tx.auditLog.create({ data: {
          actorId, action: 'UPDATE', entityType: 'TRIP', entityId: id,
          beforeData: { slug: current.slug, name: current.name, status: current.status, destinations: current.destinations.map(({ destinationId, position, isPrimary }) => ({ destinationId, position, isPrimary })) },
          afterData: { slug: updated.slug, name: updated.name, status: updated.status, destinations: links.map(({ destinationId, position, isPrimary }) => ({ destinationId, position, isPrimary })) },
        } });
        return updated;
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

    const rows = await this.prisma.destination.findMany({ where: { isActive: true }, select: { id: true, parentId: true, slug: true, name: true, sortOrder: true } });
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

  async detailPublic(slug: string) {
    const rows = await this.prisma.destination.findMany({ where: { isActive: true }, select: { id: true, parentId: true, slug: true, name: true, sortOrder: true } });
    const collect = (nodes: ReturnType<typeof buildDestinationTree>): string[] => nodes.flatMap((node) => [node.id, ...collect(node.children)]);
    const destinationIds = collect(buildDestinationTree(rows));
    if (!destinationIds.length) throw new NotFoundException('Trip tidak ditemukan.');
    const trip = await this.prisma.trip.findUnique({
      where: { slug, status: 'PUBLISHED' },
      include: {
        destinations: { where: { destinationId: { in: destinationIds } }, include: { destination: { select: { slug: true, name: true } } }, orderBy: { position: 'asc' } },
        schedules: { where: { isActive: true, departureAt: { gte: new Date() } }, orderBy: { departureAt: 'asc' } },
      },
    });
    if (!trip) throw new NotFoundException('Trip tidak ditemukan.');
    return {
      id: trip.id, slug: trip.slug, name: trip.name, summary: trip.summary, durationDays: trip.durationDays,
      itinerary: trip.itinerary, inclusions: trip.inclusions, exclusions: trip.exclusions,
      meetingPoint: trip.meetingPoint, terms: trip.terms, cancellationPolicy: trip.cancellationPolicy,
      destinations: trip.destinations.map(({ destination, position, isPrimary }) => ({ ...destination, position, isPrimary })),
      schedules: trip.schedules.map(({ heldSeats, soldSeats, capacity, ...schedule }) => ({ ...schedule, availableSeats: capacity - heldSeats - soldSeats })).filter(({ availableSeats }) => availableSeats > 0),
    };
  }

  private isUniqueError(error: unknown): error is { code: string } {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }

  private validateDestinationLinks(links: { destinationId: string; position: number; isPrimary: boolean }[]) {
    if (!links.length || new Set(links.map(({ destinationId }) => destinationId)).size !== links.length || new Set(links.map(({ position }) => position)).size !== links.length || links.filter(({ isPrimary }) => isPrimary).length !== 1) {
      throw new BadRequestException('Destinasi trip harus unik, berurutan, dan memiliki tepat satu lokasi utama.');
    }
  }

  private hasCompleteItinerary(value: unknown, durationDays: number) {
    if (!Array.isArray(value) || value.length !== durationDays) return false;
    const days = value.map((item) => {
      if (typeof item !== 'object' || item === null || !('day' in item) || !('title' in item)) return null;
      return typeof item.day === 'number' && Number.isInteger(item.day) && typeof item.title === 'string' && item.title.trim() ? item.day : null;
    });
    return days.every((day, index) => day === index + 1);
  }
}
