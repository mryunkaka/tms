import { Controller, Get, Post, Body, Req, Res, UnauthorizedException, Inject, Header } from '@nestjs/common';
import type { Request, Response } from 'express';
import { LoginDto } from './auth.dto.js';
import { AuthService } from './auth.service.js';
import { Public } from './auth.decorators.js';
import type { AppEnv } from '../config/env.js';
import { APP_ENV } from '../config/env.token.js';
import { Throttle } from '@nestjs/throttler';

const COOKIE_NAME = 'tms_refresh';
const COOKIE_PATH = '/api/v1/auth';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService, @Inject(APP_ENV) private readonly env: AppEnv) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store')
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.checkOrigin(req);
    const result = await this.auth.login(dto.email, dto.password);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Header('Cache-Control', 'no-store')
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.checkOrigin(req);
    const result = await this.auth.refresh(req.cookies?.[COOKIE_NAME]);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Header('Cache-Control', 'no-store')
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.checkOrigin(req);
    await this.auth.logout(req.cookies?.[COOKIE_NAME]);
    res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: this.env.NODE_ENV === 'production', sameSite: 'lax', path: COOKIE_PATH });
    return { status: 'ok' };
  }

  @Header('Cache-Control', 'no-store')
  @Get('me')
  me(@Req() req: Request & { user?: { sub: string } }) {
    if (!req.user?.sub) throw new UnauthorizedException();
    return this.auth.me(req.user.sub);
  }

  private checkOrigin(req: Request) {
    const origin = req.headers.origin;
    if (origin !== this.env.WEB_ORIGIN) throw new UnauthorizedException('Origin tidak diizinkan.');
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: COOKIE_PATH,
      maxAge: this.env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    });
  }
}
