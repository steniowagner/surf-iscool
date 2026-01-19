import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';

import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';

import { SupabaseAuthService } from '../service/supabase-auth.service';
import { AuthService } from '../service/auth.service';
import { SUPABASE_AUTH_GUARD } from '../utils/constants';

@Injectable()
export class SupabaseAuthStrategy extends PassportStrategy(
  Strategy,
  SUPABASE_AUTH_GUARD,
) {
  constructor(
    private readonly supabaseAuthService: SupabaseAuthService,
    private readonly authService: AuthService,
    private readonly logger: AppLoggerService,
  ) {
    super();
  }

  async validate(req: Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
      throw new UnauthorizedException(
        'Missing or invalid Authorization header',
      );

    const accessToken = authHeader.substring('Bearer '.length).trim();

    try {
      const {
        data: { user },
        error,
      } = await this.supabaseAuthService.supabase.auth.getUser(accessToken);

      if (error || !user) {
        this.logger.error('Error when verifying Supabase token.', { error });
        throw new UnauthorizedException('Invalid Supabase token.');
      }

      const dbUser = await this.authService.validateUser(user.id, user.email!);
      if (!dbUser) throw new UnauthorizedException('User not found.');
      return dbUser;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('Error when verifying Supabase token.', { error });
      throw new UnauthorizedException('Invalid Supabase token.');
    }
  }
}
