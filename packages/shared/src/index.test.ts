import { describe, expect, it } from '@jest/globals';
import { USER_ROLES } from './index';

describe('shared role contract', () => {
  it('exposes only the roles defined by the product contract', () => {
    expect(USER_ROLES).toEqual(['ADMIN', 'AGENT', 'CUSTOMER']);
  });
});
