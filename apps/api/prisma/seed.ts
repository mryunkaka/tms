import { config } from 'dotenv';
import * as argon2 from 'argon2';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { loadEnv } from '../src/config/env.js';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

export async function provisionInitialAdmin(prisma: PrismaClient, email?: string, password?: string): Promise<void> {
  const roles = await Promise.all((['ADMIN', 'AGENT', 'CUSTOMER'] as const)
    .map((name) => prisma.role.upsert({ where: { name }, create: { name }, update: {} })));
  if (!email || !password) {
    const adminExists = await prisma.userRole.findFirst({ where: { role: { name: 'ADMIN' } } });
    if (!adminExists) throw new Error('Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD to provision the first admin.');
    return;
  }

  const normalizedEmail = email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    const hasAdminRole = await prisma.userRole.findFirst({ where: { userId: existing.id, role: { name: 'ADMIN' } } });
    if (!hasAdminRole) throw new Error('Configured initial admin email belongs to an account without the ADMIN role.');
  }
  const user = existing ?? await prisma.user.create({
    data: { email: normalizedEmail, passwordHash: await argon2.hash(password, { type: argon2.argon2id }) },
  });
  const adminRole = roles.find((role) => role.name === 'ADMIN');
  if (!adminRole) throw new Error('Admin role provisioning failed.');
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
    create: { userId: user.id, roleId: adminRole.id },
    update: {},
  });
}

async function seed() {
  const env = loadEnv();
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
  try {
    await provisionInitialAdmin(prisma, env.INITIAL_ADMIN_EMAIL, env.INITIAL_ADMIN_PASSWORD);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed().catch(() => {
    process.stderr.write('Admin seed failed. Check database connectivity and required environment configuration.\n');
    process.exitCode = 1;
  });
}
