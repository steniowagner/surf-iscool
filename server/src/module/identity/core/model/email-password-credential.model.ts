import { DefaultModel, WithOptional } from '@shared-core/model/default.model';
import { generateId } from '@shared-libs/genereate-id';

export class EmailPasswordCredentialModel extends DefaultModel {
  userId: string;
  passwordHash: string;

  private constructor(data: EmailPasswordCredentialModel) {
    super();
    Object.assign(this, data);
  }

  static create(
    data: WithOptional<
      EmailPasswordCredentialModel,
      'id' | 'createdAt' | 'updatedAt'
    >,
  ) {
    return new EmailPasswordCredentialModel({
      id: data.id ?? generateId(),
      userId: data.userId,
      passwordHash: data.passwordHash,
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
    });
  }

  static createFrom(
    data: EmailPasswordCredentialModel,
  ): EmailPasswordCredentialModel {
    return new EmailPasswordCredentialModel(data);
  }
}
