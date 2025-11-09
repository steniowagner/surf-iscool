import { Injectable } from '@nestjs/common';

import { UserRepository } from '@src/module/identity/persistence/repository/user.repository';
import { DomainException } from '@shared-core/exeption/domain.exception';
import { isEmailValid } from '@shared-libs/is-email-valid';

import { UserModel } from '../model/user.model';
import { UserRole, UserStatus } from '../enum/user.enum';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findById(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new DomainException('User not found');
    }
    return user;
  }

  async create(id: string, email: string) {
    if (!isEmailValid(email)) {
      throw new DomainException(`Invalid email: ${email}`);
    }

    const user = UserModel.createFrom({
      status: UserStatus.PendingProfileInformation,
      role: UserRole.Student,
      email,
      id,
    });
    return await this.userRepository.create(user);
  }
}
