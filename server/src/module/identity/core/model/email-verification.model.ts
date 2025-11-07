import { addMinutes } from 'date-fns';

import { DefaultModel, WithOptional } from '@shared-core/model/default.model';
import { generateId } from '@shared-libs/genereate-id';

export enum EmailVerificationPurpose {
  AccountActivation = 'ACCOUNT_ACTIVATION',
  PasswordReset = 'PASSWORD_RESET',
}

export enum EmailVerificationTokenType {
  Otp = 'OTP',
}

export class EmailVerificationModel extends DefaultModel {
  userId: string;
  tokenHash: string;
  tokenType: EmailVerificationTokenType;
  purpose: EmailVerificationPurpose;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  usedAt: Date | null;
  lastAttemptAt: Date | null;

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
      | 'lastAttemptAt'
    >,
  ) {
    return new EmailVerificationModel({
      id: data.id ?? generateId(),
      userId: data.userId,
      tokenHash: data.tokenHash,
      tokenType: data.tokenType,
      purpose: data.purpose,
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
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
      lastAttemptAt: data.lastAttemptAt ?? null,
    });
  }

  static createFrom(data: EmailVerificationModel): EmailVerificationModel {
    return new EmailVerificationModel(data);
  }
}
