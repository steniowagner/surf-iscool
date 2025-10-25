import { DefaultModel, WithOptional } from '@shared-core/model/default.model';
import { generateId } from '@shared-libs/genereate-id';

export enum UserStatus {
  PendingApproval = 'PENDING_APPROVAL',
  Active = 'ACTIVE',
  Deactivated = 'DEACTIVATED',
  Deleted = 'DELETED',
}

export enum UserRole {
  Student = 'STUDENT',
  Instructor = 'INSTRUCTOR',
  Admin = 'ADMIN',
}

export class UserModel extends DefaultModel {
  firstName: string;
  lastName: string | null;
  phone: string;
  avatarUrl: string | null;
  email: string;
  passwordHash: string | null;
  status: UserStatus;
  role: UserRole;

  private constructor(data: UserModel) {
    super();
    Object.assign(this, data);
  }

  static create(
    data: WithOptional<
      UserModel,
      'id' | 'createdAt' | 'updatedAt' | 'deletedAt'
    >,
  ) {
    return new UserModel({
      ...data,
      id: data.id ?? generateId(),
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
      deletedAt: data.deletedAt ?? null,
    });
  }

  static createFrom(data: UserModel): UserModel {
    return new UserModel(data);
  }
}
