import { createHash, randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';

const DEFAULT_RANDOM_URL_SAFE_BYTES = 48;

@Injectable()
export class TokenGenerationService {
  randomUrlSafe(bytes = DEFAULT_RANDOM_URL_SAFE_BYTES): string {
    return randomBytes(bytes).toString('base64url');
  }

  sha256Hex(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }
}
