import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { HashException } from '../exception/security.exception';

type HashParams = {
  rounds: number;
  pepper: string;
  plain: string;
};

@Injectable()
export class HasherService {
  private prehash(plain: string, pepper: string) {
    if (!plain.length) {
      throw new HashException('Value cannot be empty');
    }
    const hmac = crypto
      .createHmac('sha256', pepper)
      .update(plain, 'utf8')
      .digest();
    return crypto.createHash('sha256').update(hmac).digest('hex');
  }

  hash(params: HashParams) {
    const prehashed = this.prehash(params.plain, params.pepper);
    return bcrypt.hash(prehashed, params.rounds);
  }

  compare(params: HashParams) {
    const prehashed = this.prehash(params.plain, params.pepper);
    return bcrypt.compare(params.plain, prehashed);
  }
}
