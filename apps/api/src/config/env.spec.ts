import { describe, expect, it } from '@jest/globals';
import { loadEnv } from './env.js';

const validEnvironment = {
  DATABASE_URL: 'postgresql://tms:tms@localhost:5432/tms',
  JWT_ACCESS_SECRET: 'a-test-secret-with-at-least-32-characters-long',
  WEB_ORIGIN: 'http://localhost:3000',
};

describe('environment validation', () => {
  it('applies safe defaults when optional example values are blank', () => {
    expect(loadEnv({ ...validEnvironment, NODE_ENV: '', API_PORT: '', ACCESS_TOKEN_TTL_SECONDS: '', REFRESH_TOKEN_TTL_DAYS: '', BOOKING_HOLD_MINUTES: '', DOWN_PAYMENT_PERCENT: '' })).toMatchObject({
      NODE_ENV: 'development', API_PORT: 3001, ACCESS_TOKEN_TTL_SECONDS: 900, REFRESH_TOKEN_TTL_DAYS: 30,
      BOOKING_HOLD_MINUTES: 120, DOWN_PAYMENT_PERCENT: 30,
    });
  });

  it('fails without revealing invalid secret values', () => {
    const secret = 'do-not-print-this-secret';
    expect(() => loadEnv({ ...validEnvironment, JWT_ACCESS_SECRET: secret })).toThrow();
    try {
      loadEnv({ ...validEnvironment, JWT_ACCESS_SECRET: secret });
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });
});
