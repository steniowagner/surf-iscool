import { addMinutes } from 'date-fns';

import { DefaultModel, WithOptional } from '@shared-core/model/default.model';
import { generateId } from '@shared-libs/genereate-id';

export enum Purpose {
  AccountActivation = 'ACCOUNT_ACTIVATION',
  PasswordReset = 'PASSWORD_RESET',
}

export enum TokenType {
  Otp = 'OTP',
}

export class EmailVerificationModel extends DefaultModel {
  userId: string;
  tokenHash: string;
  tokenType: TokenType;
  purpose: Purpose;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  usedAt: Date | null;

  private constructor(data: EmailVerificationModel) {
    super();
    Object.assign(this, data);
  }

  static create(
    data: WithOptional<
      EmailVerificationModel,
      | 'id'
      | 'attempts'
      | 'maxAttempts'
      | 'createdAt'
      | 'updatedAt'
      | 'usedAt'
      | 'expiresAt'
    >,
  ) {
    return new EmailVerificationModel({
      ...data,
      id: data.id ?? generateId(),
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
      attempts: data.attempts ?? 0,
      maxAttempts:
        data.maxAttempts ??
        parseInt(process.env.EMAIL_VERIFICATION_MAX_ATTEMPTS!, 10),
      expiresAt:
        data.expiresAt ??
        addMinutes(
          new Date(),
          parseInt(process.env.VERIFICATION_EMAIL_EXPIRATION_MINUTES!),
        ),
      usedAt: data.usedAt ?? null,
    });
  }

  static createFrom(data: EmailVerificationModel): EmailVerificationModel {
    return new EmailVerificationModel(data);
  }
}
