import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service.js';
import type { AppEnv } from '../config/env.js';
import { APP_ENV } from '../config/env.token.js';

const INVALID_LOGIN = 'Email atau kata sandi tidak valid.';
const REFRESH_INVALID = 'Sesi tidak valid. Silakan masuk kembali.';
const DUMMY_PASSWORD_HASH = argon2.hash(randomBytes(32).toString('hex'), { type: argon2.argon2id });

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; roles: string[] };
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, @Inject(APP_ENV) private readonly env: AppEnv) {}

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() }, include: { roles: { include: { role: true } } } });
    const valid = await argon2.verify(user?.passwordHash ?? await DUMMY_PASSWORD_HASH, password).catch(() => false);
    const roles = user?.roles.map(({ role }) => role.name) ?? [];
    if (!user?.isActive || !valid || !roles.includes('ADMIN')) throw new UnauthorizedException(INVALID_LOGIN);
    return this.issueSession(user.id, user.email, roles);
  }

  async refresh(rawToken?: string): Promise<AuthResult> {
    if (!rawToken) throw new UnauthorizedException(REFRESH_INVALID);
    const tokenHash = hashRefreshToken(rawToken);
    const now = new Date();
    const nextToken = randomBytes(32).toString('base64url');
    const nextHash = hashRefreshToken(nextToken);
    const result = await this.prisma.$transaction(async (tx) => {
      const stored = await tx.refreshToken.findUnique({ where: { tokenHash }, include: { user: { include: { roles: { include: { role: true } } } } } });
      if (!stored) return null;
      if (stored.revokedAt || stored.expiresAt <= now) {
        if (stored.revokedAt) await tx.refreshToken.updateMany({ where: { familyId: stored.familyId, revokedAt: null }, data: { revokedAt: now } });
        return null;
      }
      const claimed = await tx.refreshToken.updateMany({ where: { id: stored.id, revokedAt: null, expiresAt: { gt: now } }, data: { revokedAt: now } });
      if (claimed.count !== 1) {
        await tx.refreshToken.updateMany({ where: { familyId: stored.familyId, revokedAt: null }, data: { revokedAt: now } });
        return null;
      }
      const roles = stored.user.roles.map(({ role }) => role.name);
      if (!stored.user.isActive || !roles.includes('ADMIN')) {
        await tx.refreshToken.updateMany({ where: { familyId: stored.familyId, revokedAt: null }, data: { revokedAt: now } });
        return null;
      }
      await tx.refreshToken.create({ data: { tokenHash: nextHash, familyId: stored.familyId, userId: stored.userId, expiresAt: this.refreshExpiry(now) } });
      return { id: stored.user.id, email: stored.user.email, roles };
    });
    if (!result) throw new UnauthorizedException(REFRESH_INVALID);
    return { ...(await this.issueAccess(result.id, result.email, result.roles)), refreshToken: nextToken, user: result };
  }

  async logout(rawToken?: string): Promise<void> {
    if (rawToken) await this.prisma.refreshToken.updateMany({ where: { tokenHash: hashRefreshToken(rawToken), revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { roles: { include: { role: true } } } });
    if (!user?.isActive) throw new UnauthorizedException();
    const roles = user.roles.map(({ role }) => role.name);
    if (!roles.includes('ADMIN')) throw new UnauthorizedException();
    return { id: user.id, email: user.email, roles };
  }

  private async issueSession(id: string, email: string, roles: string[]): Promise<AuthResult> {
    const refreshToken = randomBytes(32).toString('base64url');
    const now = new Date();
    await this.prisma.refreshToken.create({ data: { tokenHash: hashRefreshToken(refreshToken), familyId: randomUUID(), userId: id, expiresAt: this.refreshExpiry(now) } });
    return { ...(await this.issueAccess(id, email, roles)), refreshToken, user: { id, email, roles } };
  }

  private async issueAccess(id: string, email: string, roles: string[]) {
    const accessToken = await this.jwt.signAsync({ sub: id, email, roles }, { expiresIn: this.env.ACCESS_TOKEN_TTL_SECONDS });
    return { accessToken };
  }

  private refreshExpiry(now: Date) {
    return new Date(now.getTime() + this.env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  }
}
