import { describe, expect, it } from '@jest/globals';
import { calculateDueIdr } from './booking-pricing.js';

describe('calculateDueIdr', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');

  it('rounds a 30 percent DP up to whole IDR at exactly seven days', () => {
    expect(calculateDueIdr(10_001, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), now, 30)).toBe(3_001);
  });

  it('requires the full amount when departure is less than seven days away', () => {
    expect(calculateDueIdr(10_001, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 - 1), now, 30)).toBe(10_001);
  });
});
