import { Injectable } from '@nestjs/common';

import { UserRole, UserStatus } from '@surf-iscool/types';

import { UserRepository } from '@src/module/identity/persistence/repository/user.repository';
import { DomainException } from '@shared-core/exeption/domain.exception';
import { isEmailValid } from '@shared-libs/is-email-valid';

import { UserModel } from '../model/user.model';

type UpdateProfileParams = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
};

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findByIdOrNull(id: string) {
    return await this.userRepository.findById(id);
  }

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

  async updateProfile(id: string, data: UpdateProfileParams) {
    const user = await this.userRepository.updateProfile({
      id,
      ...data,
    });
    if (!user) throw new DomainException('User not found');
    return user;
  }

  async deleteAccount(id: string) {
    const user = await this.userRepository.softDelete({ id });
    if (!user) throw new DomainException('User not found');
    return user;
  }
}
