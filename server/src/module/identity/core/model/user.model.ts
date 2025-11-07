import { DefaultModel, WithOptional } from '@shared-core/model/default.model';
import { generateId } from '@shared-libs/genereate-id';

export enum UserStatus {
  PendingEmailActivation = 'PENDING_EMAIL_ACTIVATION',
  PendingProfileInformation = 'PENDING_PROFILE_INFORMATION',
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
  lastName?: string | null;
  phone: string;
  avatarUrl?: string | null;
  email: string;
  status: UserStatus;
  role: UserRole;

  private constructor(data: UserModel) {
    super();
    Object.assign(this, data);
  }

  static create(
    data: WithOptional<
      UserModel,
      'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'role'
    >,
  ) {
    return new UserModel({
      id: data.id ?? generateId(),
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      avatarUrl: data.avatarUrl,
      email: data.email,
      status: data.status,
      role: data.role ?? UserRole.Student,
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
      deletedAt: data.deletedAt ?? null,
    });
  }

  static createFrom(data: UserModel): UserModel {
    return new UserModel(data);
  }
}
