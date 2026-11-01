import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { buildDestinationTree, DestinationsService } from './destinations.service.js';

describe('buildDestinationTree', () => {
  it('nests active descendants beneath their parent', () => {
    const result = buildDestinationTree([
      { id: 'child', parentId: 'parent', slug: 'child', name: 'Anak' },
      { id: 'parent', parentId: null, slug: 'parent', name: 'Induk' },
    ]);

    expect(result).toEqual([{ id: 'parent', slug: 'parent', name: 'Induk', sortOrder: 0, children: [{ id: 'child', slug: 'child', name: 'Anak', sortOrder: 0, children: [] }] }]);
  });

  it('does not expose a child whose parent is inactive', () => {
    const result = buildDestinationTree([
      { id: 'child', parentId: 'inactive', slug: 'child', name: 'Anak' },
    ]);

    expect(result).toEqual([]);
  });

  it('sorts siblings by operator order, name, and a stable slug/id tie-break', () => {
    const result = buildDestinationTree([
      { id: 'second', parentId: null, slug: 'second', name: 'Bali', sortOrder: 20 },
      { id: 'tie-z', parentId: null, slug: 'tie-z', name: 'Zamrud', sortOrder: 10 },
      { id: 'first', parentId: null, slug: 'first', name: 'Kotabaru', sortOrder: 0 },
      { id: 'tie-a', parentId: null, slug: 'tie-a', name: 'Anyer', sortOrder: 10 },
      { id: 'same-name-z', parentId: null, slug: 'z-bandung', name: 'Bandung', sortOrder: 10 },
      { id: 'same-name-a', parentId: null, slug: 'a-bandung', name: 'Bandung', sortOrder: 10 },
    ] as Parameters<typeof buildDestinationTree>[0]);

    expect(result.map(({ id }) => id)).toEqual(['first', 'tie-a', 'same-name-a', 'same-name-z', 'tie-z', 'second']);
  });
});

describe('DestinationsService admin operations', () => {
  const tx = {
    destination: {
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({ id: 'destination-1', slug: 'kotabaru', name: 'Kotabaru' }),
      findMany: jest.fn<(...args: unknown[]) => Promise<unknown[]>>().mockResolvedValue([]),
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockImplementation(async (...args) => ({ id: 'destination-new', ...((args[0] as { data: object }).data) })),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockImplementation(async (...args) => args[0]),
    },
    tripDestination: { findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(null) },
    auditLog: { create: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({}) },
  };
  const prisma = {
    ...tx,
    $transaction: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockImplementation(async (...args) => (args[0] as (transaction: typeof tx) => Promise<unknown>)(tx)),
  };
  let service: DestinationsService;

  beforeEach(() => { jest.clearAllMocks(); service = new DestinationsService(prisma as never); });

  it('sorts the admin destination list with stable slug and ID tie-breaks', async () => {
    await service.listAdmin();
    expect(tx.destination.findMany).toHaveBeenCalledWith({
      include: { parent: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }, { slug: 'asc' }, { id: 'asc' }],
    });
  });

  it('persists the requested order when creating a destination', async () => {
    await service.create({ slug: 'bali', name: 'Bali', sortOrder: 5 }, 'admin-1');
    expect(tx.destination.create).toHaveBeenCalledWith({ data: { slug: 'bali', name: 'Bali', sortOrder: 5, isActive: false } });
  });

  it('persists the requested order when updating a destination', async () => {
    await service.update('destination-1', { sortOrder: 5 }, 'admin-1');
    expect(tx.destination.update).toHaveBeenCalledWith({ where: { id: 'destination-1' }, data: { sortOrder: 5 } });
  });

  it('records the old and new order in the destination audit event', async () => {
    tx.destination.findUnique.mockResolvedValueOnce({ id: 'destination-1', slug: 'kotabaru', name: 'Kotabaru', description: null, parentId: null, isActive: true, sortOrder: 2 });
    tx.destination.update.mockResolvedValueOnce({ id: 'destination-1', slug: 'kotabaru', name: 'Kotabaru', description: null, parentId: null, isActive: true, sortOrder: 5 });

    await service.update('destination-1', { sortOrder: 5 }, 'admin-1');

    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      beforeData: expect.objectContaining({ sortOrder: 2 }),
      afterData: expect.objectContaining({ sortOrder: 5 }),
    }) });
  });

  it('creates destinations inactive until explicitly published', async () => {
    const result = await service.create({ slug: 'kotabaru', name: 'Kotabaru', parentId: undefined }, 'admin-1');
    expect(result).toEqual({ id: 'destination-new', slug: 'kotabaru', name: 'Kotabaru', parentId: undefined, isActive: false });
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ actorId: 'admin-1', action: 'CREATE', entityType: 'DESTINATION', entityId: 'destination-new' }) });
  });

  it('refuses to archive a destination used by a published trip', async () => {
    tx.destination.findMany.mockResolvedValue([
      { id: 'destination-1', parentId: null },
      { id: 'child-1', parentId: 'destination-1' },
    ]);
    tx.tripDestination.findFirst.mockResolvedValue({ tripId: 'trip-1' });
    await expect(service.archive('destination-1', 'admin-1')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.tripDestination.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { destinationId: { in: ['destination-1', 'child-1'] }, trip: { status: 'PUBLISHED' } } }));
  });
});
