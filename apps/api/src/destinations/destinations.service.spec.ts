import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { buildDestinationTree, DestinationsService } from './destinations.service.js';

describe('buildDestinationTree', () => {
  it('nests active descendants beneath their parent', () => {
    const result = buildDestinationTree([
      { id: 'child', parentId: 'parent', slug: 'child', name: 'Anak' },
      { id: 'parent', parentId: null, slug: 'parent', name: 'Induk' },
    ]);

    expect(result).toEqual([{ id: 'parent', slug: 'parent', name: 'Induk', children: [{ id: 'child', slug: 'child', name: 'Anak', children: [] }] }]);
  });

  it('does not expose a child whose parent is inactive', () => {
    const result = buildDestinationTree([
      { id: 'child', parentId: 'inactive', slug: 'child', name: 'Anak' },
    ]);

    expect(result).toEqual([]);
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
