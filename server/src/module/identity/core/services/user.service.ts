import { Injectable } from '@nestjs/common';

import { UserRepository } from '@src/module/identity/persistence/repository/user.repository';
import { DomainException } from '@shared-core/exeption/domain.exception';
import { isEmailValid } from '@shared-libs/is-email-valid';

type CreateUserDto = {
  firstName: string;
  lastName?: string;
  avatarUrl?: string;
  email: string;
  phone: string;
};

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  create(user: CreateUserDto) {
    if (!isEmailValid(user.email)) {
      throw new DomainException(`Invalid email: ${user.email}`);
    }
  }
}
