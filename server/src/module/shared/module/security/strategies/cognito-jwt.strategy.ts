import { Injectable, UnauthorizedException } from '@nestjs/common';
import jwksRsa, { JwksClient, SigningKey } from 'jwks-rsa';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import * as jwt from 'jsonwebtoken';
import { type Request } from 'express';

import { ConfigService } from '@shared-modules/config/service/config.service';

import { AuthService } from '../service/auth.service';

export type CognitoJwtPayload = {
  sub: string;
  email: string;
  token_use: 'access' | 'id';
  iss: string;
  client_id: string;
};

type CompleteDecodedToken = {
  header: jwt.JwtHeader;
  payload: jwt.JwtPayload | string;
  signature: string;
};

@Injectable()
export class CognitoJwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private allowedClientIds: string[];
  private jwksClient: JwksClient;
  private issuer: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const jwksUri = configService.get('cognitoJwksUri');
    const webClientId = configService.get('cognitoWebClientId');
    const mobileClientId = configService.get('cognitoMobileClientId');
    const issuer = configService.get('cognitoIssuer');

    const jwksClient = jwksRsa({
      cache: true,
      rateLimit: true,
      jwksUri,
    });

    const getKey = (
      _request: Request,
      rawJwtToken: string,
      done: (err: any, key?: string | Buffer) => void,
    ) => {
      const decoded = jwt.decode(rawJwtToken, {
        complete: true,
      }) as CompleteDecodedToken | null;

      if (!decoded || !decoded.header || !decoded.header.kid)
        return done(new Error('Missing kid in token header.'));

      jwksClient.getSigningKey(
        decoded.header.kid,
        (err: Error | null, key: SigningKey) => {
          if (err) return done(err);
          const signingKey = key.getPublicKey();
          return done(null, signingKey);
        },
      );
    };

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      issuer,
      algorithms: ['RS256'],
      ignoreExpiration: false,
      secretOrKeyProvider: getKey,
    });

    this.jwksClient = jwksClient;
    this.issuer = issuer;
    this.allowedClientIds = [webClientId, mobileClientId];
  }

  async validate(payload: CognitoJwtPayload) {
    if (payload.iss !== this.issuer) {
      throw new UnauthorizedException('Invalid issuer');
    }

    if (!this.allowedClientIds.includes(payload.client_id)) {
      throw new UnauthorizedException('Invalid client');
    }

    if (payload.token_use !== 'access') {
      throw new UnauthorizedException('Invalid token use');
    }

    const user = await this.authService.validateCognitoUser(
      payload.sub,
      payload.email,
    );
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }
    return user;
  }
}
