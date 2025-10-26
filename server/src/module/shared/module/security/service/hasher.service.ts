import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class HasherService {
  hash(plain: string, rounds: number) {
    return bcrypt.hash(plain, rounds);
  }

  compare(plain: string, hash: string) {
    return bcrypt.compare(plain, hash);
  }
}
