import { addMinutes } from 'date-fns';

import { DefaultModel, WithOptional } from '@shared-core/model/default.model';
import { generateId } from '@shared-libs/genereate-id';

export class EmailVerification extends DefaultModel {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;

  private constructor(data: EmailVerification) {
    super();
    Object.assign(this, data);
  }

  static create(
    data: WithOptional<
      EmailVerification,
      'id' | 'createdAt' | 'updatedAt' | 'usedAt' | 'expiresAt'
    >,
  ) {
    return new EmailVerification({
      ...data,
      id: data.id ?? generateId(),
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
      expiresAt:
        data.expiresAt ??
        addMinutes(
          new Date(),
          parseInt(process.env.VERIFICATION_EMAIL_EXPIRATION_MINUTES!),
        ),
      usedAt: data.usedAt ?? null,
    });
  }

  static createFrom(data: EmailVerification): EmailVerification {
    return new EmailVerification(data);
  }
}
