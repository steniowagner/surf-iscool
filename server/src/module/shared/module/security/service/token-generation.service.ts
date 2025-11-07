import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { Injectable } from '@nestjs/common';

import { ConfigService } from '@shared-modules/config/service/config.service';

import { OTP } from '../types';

type CompareOtpParams = {
  inputCode: string;
  storedHash: string;
  scope: string;
};

@Injectable()
export class TokenGenerationService {
  constructor(private readonly configService: ConfigService) {}

  private createHmacHex(secretKey: Buffer, payload: string) {
    return createHmac('sha256', secretKey).update(payload).digest('hex');
  }

  generateOtp(scope: string): OTP {
    const ttlMs = this.configService.get('verificationEmailExpirationMs');
    const secretKey = this.configService.get('otpSecretBytes');
    const length = this.configService.get('otpLength');

    const max = 10 ** length;
    const value = randomInt(0, max);
    const code = value.toString().padStart(length, '0');
    const codeHash = this.createHmacHex(secretKey, `${scope}:${code}`);

    return { code, codeHash, expiresAt: new Date(Date.now() + ttlMs) };
  }

  compareOtp(params: CompareOtpParams) {
    const secretKey = this.configService.get('otpSecretBytes');
    const expectedHash = this.createHmacHex(
      secretKey,
      `${params.scope}:${params.inputCode}`,
    );
    // Constant-time compare on bytes (not utf8 text)
    const storedHashBuffer = Buffer.from(params.storedHash, 'hex');
    const expectedHashBuffer = Buffer.from(expectedHash, 'hex');
    // Keep timing stable if lengths differ
    if (storedHashBuffer.length !== expectedHashBuffer.length) {
      // Compare against a dummy buffer of same length to avoid throwing/timing leak
      const dummy = Buffer.alloc(
        Math.max(storedHashBuffer.length, expectedHashBuffer.length),
        0,
      );

      try {
        timingSafeEqual(
          dummy.subarray(0, storedHashBuffer.length),
          storedHashBuffer,
        );
        // eslint-disable-next-line no-empty
      } catch {}

      try {
        timingSafeEqual(
          dummy.subarray(0, expectedHashBuffer.length),
          expectedHashBuffer,
        );
        // eslint-disable-next-line no-empty
      } catch {}

      return false;
    }

    try {
      return timingSafeEqual(storedHashBuffer, expectedHashBuffer);
    } catch {
      return false;
    }
  }
}
