import { createHmac, randomInt } from 'crypto';
import { Injectable } from '@nestjs/common';

import { ConfigService } from '@shared-modules/config/service/config.service';

import { OTP } from '../types';

@Injectable()
export class TokenGenerationService {
  constructor(private readonly configService: ConfigService) {}

  generateOtp(scope: string): OTP {
    const ttlMs = this.configService.get('verificationEmailExpirationMs');
    const secretKey = this.configService.get('otpSecretBytes');
    const length = this.configService.get('otpLength');

    const max = 10 ** length;
    const value = randomInt(0, max);
    const code = value.toString().padStart(length, '0');
    const codeHash = createHmac('sha256', secretKey)
      .update(`${scope}:${code}`)
      .digest('hex');

    return { code, codeHash, expiresAt: new Date(Date.now() + ttlMs) };
  }
}
