import { PassThrough } from 'node:stream';
import { describe, expect, it } from '@jest/globals';
import { createPinoLogger, PinoNestLogger } from './pino-logger.js';

describe('Pino logging', () => {
  it('redacts credentials and contact fields from structured events', async () => {
    const stream = new PassThrough();
    let output = '';
    stream.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    const logger = createPinoLogger(stream);
    logger.info({ password: 'password-value', secret: 'server-secret', signature: 'signature-value', user: { email: 'person@example.test', phone: '+62812345678' }, req: { headers: { authorization: 'Bearer secret-token', cookie: 'refresh=secret-cookie' } } }, 'login');
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(output).toContain('[REDACTED]');
    expect(output).not.toContain('password-value');
    expect(output).not.toContain('person@example.test');
    expect(output).not.toContain('+62812345678');
    expect(output).not.toContain('secret-token');
    expect(output).not.toContain('secret-cookie');
    expect(output).not.toContain('server-secret');
    expect(output).not.toContain('signature-value');
  });

  it('does not serialize arbitrary object log messages', async () => {
    const stream = new PassThrough();
    let output = '';
    stream.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    const logger = new PinoNestLogger(stream);
    logger.error({ message: 'password-value', password: 'password-value' });
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(output).toContain('Application event');
    expect(output).not.toContain('password-value');
  });
});
