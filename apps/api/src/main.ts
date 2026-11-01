import { config } from 'dotenv';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { pinoHttp } from 'pino-http';
import { AppModule } from './app.module.js';
import { loadEnv } from './config/env.js';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { PinoNestLogger } from './common/pino-logger.js';

config({ path: resolve(process.cwd(), '../../.env') });

async function bootstrap() {
  const env = loadEnv();
  const logger = new PinoNestLogger();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(), { logger });
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(pinoHttp({
    logger: logger.pinoLogger,
    genReqId: (_request, response) => {
      const id = randomUUID();
      response.setHeader('x-request-id', id);
      return id;
    },
    serializers: {
      req: (request) => ({ id: request.id, method: request.method, url: request.url?.split('?')[0] ?? '' }),
      res: (response) => ({ statusCode: response.statusCode }),
    },
    customErrorMessage: () => 'request errored',
    customErrorObject: (_request, _response, error) => ({ err: { type: error.name } }),
  }));
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('');
  await app.listen(env.API_PORT, '127.0.0.1');
}

void bootstrap();
