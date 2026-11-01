import type { LoggerService } from '@nestjs/common';
import pino, { type DestinationStream, type Logger as PinoLogger } from 'pino';

export const REDACTED_LOG_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.email',
  'req.body.phone',
  'req.body.bookerName',
  'req.body.participants',
  'res.headers.set-cookie',
  'password',
  '*.password',
  'token',
  '*.token',
  'secret',
  '*.secret',
  'serverKey',
  '*.serverKey',
  'signature',
  '*.signature',
  'accessToken',
  'refreshToken',
  '*.email',
  '*.phone',
  '*.bookerName',
  '*.fullName',
  '*.participants',
  '*.contact',
];

export function createPinoLogger(destination: DestinationStream = process.stdout) {
  return pino({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    redact: { paths: REDACTED_LOG_PATHS, censor: '[REDACTED]' },
  }, destination);
}

function safeMessage(message: unknown) {
  if (typeof message === 'string') return message;
  if (message instanceof Error) return `Application error (${message.name})`;
  return 'Application event';
}

export class PinoNestLogger implements LoggerService {
  private readonly logger: PinoLogger;

  constructor(destination: DestinationStream = process.stdout) {
    this.logger = createPinoLogger(destination);
  }

  get pinoLogger() { return this.logger; }

  log(message: unknown, ...optionalParams: unknown[]) { this.write('info', message, optionalParams); }
  error(message: unknown, ...optionalParams: unknown[]) { this.write('error', message, optionalParams); }
  warn(message: unknown, ...optionalParams: unknown[]) { this.write('warn', message, optionalParams); }
  debug(message: unknown, ...optionalParams: unknown[]) { this.write('debug', message, optionalParams); }
  verbose(message: unknown, ...optionalParams: unknown[]) { this.write('trace', message, optionalParams); }
  fatal(message: unknown, ...optionalParams: unknown[]) { this.write('fatal', message, optionalParams); }

  private write(level: 'info' | 'error' | 'warn' | 'debug' | 'trace' | 'fatal', message: unknown, optionalParams: unknown[]) {
    const context = optionalParams.filter((value): value is string => typeof value === 'string').at(-1);
    this.logger[level]({ ...(context ? { context } : {}) }, safeMessage(message));
  }
}
