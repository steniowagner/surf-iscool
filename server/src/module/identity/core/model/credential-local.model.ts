import { DefaultModel, WithOptional } from '@shared-core/model/default.model';
import { generateId } from '@shared-libs/genereate-id';

export class CredentialLocalModel extends DefaultModel {
  userId: string;
  passwordHash: string;

  private constructor(data: CredentialLocalModel) {
    super();
    Object.assign(this, data);
  }

  static create(
    data: WithOptional<CredentialLocalModel, 'id' | 'createdAt' | 'updatedAt'>,
  ) {
    return new CredentialLocalModel({
      ...data,
      id: data.id ?? generateId(),
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
    });
  }

  static createFrom(data: CredentialLocalModel): CredentialLocalModel {
    return new CredentialLocalModel(data);
  }
}
