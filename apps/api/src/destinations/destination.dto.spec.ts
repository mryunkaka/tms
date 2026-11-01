import { describe, expect, it } from '@jest/globals';
import { validate } from 'class-validator';
import { CreateDestinationDto, UpdateDestinationDto } from './destination.dto.js';

describe('destination ordering input', () => {
  it('rejects a negative destination order', async () => {
    const dto = Object.assign(new UpdateDestinationDto(), { sortOrder: -1 });

    expect(await validate(dto)).toHaveLength(1);
  });

  it('keeps order optional for existing destination edits', async () => {
    const dto = Object.assign(new UpdateDestinationDto(), { isActive: true });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a negative destination order on creation', async () => {
    const dto = Object.assign(new CreateDestinationDto(), { slug: 'test', name: 'Test', sortOrder: -1 });

    expect(await validate(dto)).toHaveLength(1);
  });

  it('rejects a fractional destination order', async () => {
    const dto = Object.assign(new UpdateDestinationDto(), { sortOrder: 1.5 });

    expect(await validate(dto)).toHaveLength(1);
  });

  it('rejects null instead of treating it as an omitted order', async () => {
    const dto = Object.assign(new UpdateDestinationDto(), { sortOrder: null });

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('rejects values above PostgreSQL integer range', async () => {
    const dto = Object.assign(new UpdateDestinationDto(), { sortOrder: 2_147_483_648 });

    expect(await validate(dto)).not.toHaveLength(0);
  });
});
