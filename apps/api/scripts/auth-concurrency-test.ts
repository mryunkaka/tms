import { config } from 'dotenv';
import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../src/database/prisma.service.js';
import { loadEnv } from '../src/config/env.js';
import { AuthService, hashRefreshToken } from '../src/auth/auth.service.js';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

const prisma = new PrismaService();
const env = loadEnv();
const familyId = randomUUID();
const rawToken = randomBytes(32).toString('base64url');

try {
  await prisma.$connect();
  const admin = await prisma.user.findFirst({
    where: { isActive: true, roles: { some: { role: { name: 'ADMIN' } } } },
    select: { id: true },
  });
  if (!admin) throw new Error('An active admin is required for the isolated refresh-race check.');
  await prisma.refreshToken.create({ data: {
    tokenHash: hashRefreshToken(rawToken), familyId, userId: admin.id,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  } });

  const service = new AuthService(
    prisma,
    new JwtService({ secret: env.JWT_ACCESS_SECRET, signOptions: { expiresIn: env.ACCESS_TOKEN_TTL_SECONDS } }),
    env,
  );
  const attempts = await Promise.allSettled([service.refresh(rawToken), service.refresh(rawToken)]);
  const successful = attempts.filter((result) => result.status === 'fulfilled');
  const results = successful.map((result) => result.status === 'fulfilled' ? result.value : null);
  const persisted = await prisma.refreshToken.findMany({ where: { familyId }, select: { revokedAt: true } });
  const activeTokens = persisted.filter(({ revokedAt }) => revokedAt === null).length;
  const sameRotation = results.length === 2 && results[0]?.refreshToken === results[1]?.refreshToken;
  if (successful.length !== 2 || !sameRotation || persisted.length !== 2 || activeTokens !== 1) {
    throw new Error(`Refresh-race invariant failed: successful=${successful.length}, familySize=${persisted.length}, activeTokens=${activeTokens}.`);
  }
  process.stdout.write(`PostgreSQL refresh race passed: successful=${successful.length}, shared rotation result, active family tokens=${activeTokens}.\n`);
} finally {
  await prisma.refreshToken.deleteMany({ where: { familyId } });
  await prisma.$disconnect();
}
