import { randomBytes, createHmac } from 'crypto';
import { Injectable } from '@nestjs/common';

import { OTP } from '../types';

type GenerateOtpParams = {
  secret: string;
  length: number;
  ttl: number;
};

@Injectable()
export class TokenGenerationService {
  generateOtp(params: GenerateOtpParams): OTP {
    const randomBuffer = randomBytes(4);
    const randomValue = randomBuffer.readUint32BE(0) % 1_000_000;
    const code = randomValue.toString().padStart(params.length, '0');
    const codeHash = createHmac('sha256', params.secret)
      .update(code)
      .digest('hex');

    const expiresAt = new Date(Date.now() + params.ttl);

    return { code, codeHash, expiresAt };
  }
}
