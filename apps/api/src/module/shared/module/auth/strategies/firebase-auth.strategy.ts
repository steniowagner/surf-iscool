import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DecodedIdToken } from 'firebase-admin/auth';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';

import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';

import { FirebaseAuthService } from '../service/firebase-auth.service';
import { AuthService } from '../service/auth.service';

@Injectable()
export class FirebaseAuthStrategy extends PassportStrategy(
  Strategy,
  'firebase',
) {
  constructor(
    private readonly firebaseAuthService: FirebaseAuthService,
    private readonly authService: AuthService,
    private readonly logger: AppLoggerService,
  ) {
    super();
  }

  async validate(req: Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization header',
      );
    }

    let decoded: DecodedIdToken;
    try {
      const idToken = authHeader.substring('Bearer '.length).trim();
      decoded = await this.firebaseAuthService
        .auth()
        .verifyIdToken(idToken, true);
    } catch (error: unknown) {
      this.logger.error('Error when verifying firebase-id-token token.', {
        error,
      });
      throw new UnauthorizedException('Invalid Firebase ID token.');
    }

    const user = await this.authService.validateUser(
      decoded.uid,
      decoded.email!,
    );

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    return user;
  }
}
