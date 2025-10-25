import { DefaultModel, WithOptional } from '@shared-core/model/default.model';
import { generateId } from '@shared-libs/genereate-id';

export enum AuthProvider {
  Password = 'PASSWORD',
  Facebook = 'FACEBOOK',
  Google = 'GOOGLE',
}

export class AuthProviderModel extends DefaultModel {
  userId: string;
  provider: AuthProvider;
  providerUserId: string;
  isEmailVerified: boolean;

  private constructor(data: AuthProviderModel) {
    super();
    Object.assign(this, data);
  }

  static create(
    data: WithOptional<AuthProviderModel, 'id' | 'createdAt' | 'updatedAt'>,
  ) {
    return new AuthProviderModel({
      ...data,
      id: data.id ?? generateId(),
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
    });
  }

  static createFrom(data: AuthProviderModel): AuthProviderModel {
    return new AuthProviderModel(data);
  }
}
