import { Injectable } from '@nestjs/common';

import { UserRole, UserStatus } from '@surf-iscool/types';

import { DomainException } from '@shared-core/exeption/domain.exception';
import { UserRepository } from '@src/module/identity/persistence/repository/user.repository';
import { UserRoleHistoryRepository } from '@src/module/identity/persistence/repository/user-role-history.repository';

type ListUsersParams = {
  status?: UserStatus;
  role?: UserRole;
};

type ChangeRoleParams = {
  userId: string;
  adminId: string;
  newRole: UserRole;
  reason?: string;
};

@Injectable()
export class AdminUserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userRoleHistoryRepository: UserRoleHistoryRepository,
  ) {}

  async listUsers(params: ListUsersParams) {
    return await this.userRepository.findAll(params);
  }

  async approveUser(userId: string, adminId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new DomainException('User not found');
    if (user.status !== UserStatus.PendingApproval)
      throw new DomainException('User is not pending approval');

    const updatedUser = await this.userRepository.approve({
      id: userId,
      approvedBy: adminId,
    });

    if (!updatedUser) throw new DomainException('Failed to approve user');

    return updatedUser;
  }

  async denyUser(userId: string, adminId: string, reason?: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new DomainException('User not found');

    if (user.status !== UserStatus.PendingApproval)
      throw new DomainException('User is not pending approval');

    const updatedUser = await this.userRepository.deny({
      id: userId,
      deniedBy: adminId,
      denialReason: reason,
    });

    if (!updatedUser) throw new DomainException('Failed to deny user');

    return updatedUser;
  }

  async changeRole(params: ChangeRoleParams) {
    const user = await this.userRepository.findById(params.userId);
    if (!user) throw new DomainException('User not found');

    if (user.role === params.newRole)
      throw new DomainException('User already has this role');

    if (params.newRole === UserRole.Admin)
      throw new DomainException('Cannot promote user to Admin role');

    const previousRole = user.role;

    const updatedUser = await this.userRepository.updateRole({
      id: params.userId,
      role: params.newRole,
    });

    if (!updatedUser) throw new DomainException('Failed to change user role');

    await this.userRoleHistoryRepository.create({
      userId: params.userId,
      previousRole,
      newRole: params.newRole,
      changedBy: params.adminId,
      reason: params.reason,
    });

    return updatedUser;
  }

  async deleteUser(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new DomainException('User not found');
    if (user.status === UserStatus.Deleted)
      throw new DomainException('User is already deleted');

    const deletedUser = await this.userRepository.softDelete({ id: userId });
    if (!deletedUser) throw new DomainException('Failed to delete user');
    return deletedUser;
  }

  async reactivateUser(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new DomainException('User not found');
    if (user.status !== UserStatus.Deleted)
      throw new DomainException('User is not deleted');

    const updatedUser = await this.userRepository.reactivate({ id: userId });
    if (!updatedUser) throw new DomainException('Failed to reactivate user');
    return updatedUser;
  }
}
