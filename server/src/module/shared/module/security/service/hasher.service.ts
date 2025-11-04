import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { ConfigService } from '@shared-modules/config/service/config.service';

import { HashException } from '../exception/security.exception';

type CompareParams = {
  plain: string;
  storedHash: string;
  pepper?: string;
};

@Injectable()
export class HasherService {
  constructor(private readonly configService: ConfigService) {}

  private prehash(plain: string, pepper: string) {
    if (!plain.length) throw new HashException('Value cannot be empty');
    if (plain.length > 10_000) throw new HashException('Value too long');
    if (!pepper.length) throw new HashException('Pepper is required');
    const hmac = crypto
      .createHmac('sha256', pepper)
      .update(plain, 'utf8')
      .digest();
    return crypto.createHash('sha256').update(hmac).digest('hex');
  }

  hash(plain: string) {
    const pepper = this.configService.get('passwordHashPepper');
    const rounds = this.configService.get('hashRounds');
    const prehashed = this.prehash(plain, pepper);
    return bcrypt.hash(prehashed, rounds);
  }

  compare(params: CompareParams) {
    const pepper =
      params.pepper ?? this.configService.get('passwordHashPepper');
    const prehashed = this.prehash(params.plain, pepper);
    return bcrypt.compare(prehashed, params.storedHash);
  }
}
