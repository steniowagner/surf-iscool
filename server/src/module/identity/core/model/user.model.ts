import { DefaultModel, WithOptional } from '@shared-core/model/default.model';

import { UserRole, UserStatus } from '../enum/user.enum';

export class UserModel extends DefaultModel {
  email: string;
  status: UserStatus;
  role: UserRole;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;

  private constructor(data: UserModel) {
    super();
    Object.assign(this, data);
  }

  static create(
    data: WithOptional<
      UserModel,
      | 'role'
      | 'status'
      | 'firstName'
      | 'lastName'
      | 'phone'
      | 'avatarUrl'
      | 'deletedAt'
    >,
  ) {
    return new UserModel({
      id: data.id,
      email: data.email,
      role: data.role ?? UserRole.Student,
      status: data.status ?? UserStatus.PendingProfileInformation,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      avatarUrl: data.avatarUrl,
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
      deletedAt: data.deletedAt ?? null,
    });
  }

  static createFrom(data: UserModel): UserModel {
    return new UserModel(data);
  }
}
