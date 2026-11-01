import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateDestinationDto, UpdateDestinationDto } from './destination.dto.js';

type DestinationRow = { id: string; parentId: string | null; slug: string; name: string };
type PublicDestination = { id: string; slug: string; name: string; children: PublicDestination[] };

export function buildDestinationTree(rows: DestinationRow[]): PublicDestination[] {
  const nodes = new Map<string, PublicDestination>();
  for (const row of rows) nodes.set(row.id, { id: row.id, slug: row.slug, name: row.name, children: [] });
  const roots: PublicDestination[] = [];
  for (const row of rows) {
    const node = nodes.get(row.id)!;
    const parent = row.parentId ? nodes.get(row.parentId) : undefined;
    if (parent) parent.children.push(node);
    else if (!row.parentId) roots.push(node);
  }
  const sort = (items: PublicDestination[]) => {
    items.sort((a, b) => a.name.localeCompare(b.name, 'id'));
    items.forEach((item) => sort(item.children));
  };
  sort(roots);
  return roots;
}

@Injectable()
export class DestinationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAdmin() {
    return this.prisma.destination.findMany({ include: { parent: true }, orderBy: { name: 'asc' } });
  }

  async create(input: CreateDestinationDto, actorId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (input.parentId && !await tx.destination.findUnique({ where: { id: input.parentId }, select: { id: true } })) {
          throw new NotFoundException('Destinasi induk tidak ditemukan.');
        }
        const created = await tx.destination.create({ data: { ...input, isActive: false } });
        await tx.auditLog.create({ data: { actorId, action: 'CREATE', entityType: 'DESTINATION', entityId: created.id, afterData: { slug: created.slug, name: created.name, parentId: created.parentId, isActive: created.isActive } } });
        return created;
      });
    } catch (error) {
      if (this.isUniqueError(error)) throw new ConflictException('Slug destinasi sudah digunakan.');
      throw error;
    }
  }

  async update(id: string, input: UpdateDestinationDto, actorId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const current = await tx.destination.findUnique({ where: { id }, select: { id: true, slug: true, name: true, description: true, parentId: true, isActive: true } });
        if (!current) throw new NotFoundException('Destinasi tidak ditemukan.');
        if (input.parentId !== undefined && input.parentId !== null) {
          const rows = await tx.destination.findMany({ select: { id: true, parentId: true } });
          const parents = new Map(rows.map((row) => [row.id, row.parentId]));
          if (!parents.has(input.parentId)) throw new NotFoundException('Destinasi induk tidak ditemukan.');
          let ancestor: string | null | undefined = input.parentId;
          const visited = new Set<string>();
          while (ancestor && !visited.has(ancestor)) {
            if (ancestor === id) throw new BadRequestException('Hierarki destinasi tidak boleh membentuk siklus.');
            visited.add(ancestor);
            ancestor = parents.get(ancestor);
          }
        }
        const updated = await tx.destination.update({ where: { id }, data: input });
        await tx.auditLog.create({ data: { actorId, action: 'UPDATE', entityType: 'DESTINATION', entityId: id, beforeData: current, afterData: { slug: updated.slug, name: updated.name, description: updated.description, parentId: updated.parentId, isActive: updated.isActive } } });
        return updated;
      });
    } catch (error) {
      if (this.isUniqueError(error)) throw new ConflictException('Slug destinasi sudah digunakan.');
      throw error;
    }
  }

  async archive(id: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.destination.findUnique({ where: { id }, select: { id: true, slug: true, name: true, description: true, parentId: true, isActive: true } });
      if (!current) throw new NotFoundException('Destinasi tidak ditemukan.');
      const rows = await tx.destination.findMany({ select: { id: true, parentId: true } });
      const children = new Map<string, string[]>();
      for (const row of rows) if (row.parentId) children.set(row.parentId, [...(children.get(row.parentId) ?? []), row.id]);
      const branchIds = [id];
      for (let i = 0; i < branchIds.length; i++) branchIds.push(...(children.get(branchIds[i]) ?? []));
      const publishedTrip = await tx.tripDestination.findFirst({ where: { destinationId: { in: branchIds }, trip: { status: 'PUBLISHED' } }, select: { tripId: true } });
      if (publishedTrip) throw new ConflictException('Pindahkan destinasi dari trip terbit sebelum mengarsipkannya.');
      const archived = await tx.destination.update({ where: { id }, data: { isActive: false } });
      await tx.auditLog.create({ data: { actorId, action: 'ARCHIVE', entityType: 'DESTINATION', entityId: id, beforeData: current, afterData: { ...current, isActive: false } } });
      return archived;
    });
  }

  async publicTree() {
    const rows = await this.prisma.destination.findMany({
      where: { isActive: true },
      select: { id: true, parentId: true, slug: true, name: true },
    });
    return buildDestinationTree(rows);
  }

  private isUniqueError(error: unknown): error is { code: string } {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
