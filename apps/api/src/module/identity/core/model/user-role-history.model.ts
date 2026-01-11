import { UserRole } from '@surf-iscool/types';

import { WithOptional } from '@shared-core/model/default.model';

export class UserRoleHistoryModel {
  readonly id!: string;
  userId!: string;
  previousRole!: UserRole;
  newRole!: UserRole;
  changedBy!: string;
  reason?: string | null;
  createdAt!: Date;

  private constructor(data: UserRoleHistoryModel) {
    Object.assign(this, data);
  }

  static create(
    data: WithOptional<UserRoleHistoryModel, 'id' | 'createdAt'>,
  ): UserRoleHistoryModel {
    return new UserRoleHistoryModel({
      id: data.id ?? crypto.randomUUID(),
      userId: data.userId,
      previousRole: data.previousRole,
      newRole: data.newRole,
      changedBy: data.changedBy,
      reason: data.reason ?? null,
      createdAt: data.createdAt ?? new Date(),
    });
  }

  static createFrom(data: UserRoleHistoryModel): UserRoleHistoryModel {
    return new UserRoleHistoryModel(data);
  }
}
