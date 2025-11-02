import { z } from 'zod';

import { envs } from '@shared-libs/load-env';

const decodeSecret = (secret: string): Buffer => {
  if (/^[A-Fa-f0-9]+$/.test(secret)) {
    return Buffer.from(secret, 'hex');
  }
  if (/^[A-Za-z0-9+/=]+$/.test(secret)) {
    return Buffer.from(secret, 'base64');
  }
  return Buffer.from(secret, 'utf8');
};

export const environmentSchema = z.enum(envs);

export const databaseSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535),
  username: z.string().min(1),
  password: z.string().min(1),
  database: z.string().min(1),
});

export const baseSchema = z.object({
  env: environmentSchema,
  port: z.coerce.number().positive().int(),

  database: databaseSchema,

  // Auth policy
  passwordMinLength: z.coerce.number().int().min(8).max(128),

  // OTP policy
  verificationEmailExpirationMinutes: z.coerce.number().int().min(1).max(5),
  verificationEmailMaxAttempts: z.coerce.number().int().min(1).max(3),
  otpLength: z.coerce.number().int().min(4).max(6),

  // Secrets / providers
  noReplyEmailSender: z.email(),
  resendApiKey: z.string().min(16),

  // Bcrypt cost/rounds (centralized)
  hashRounds: z.coerce.number().int().min(10).max(16),

  // Secrets validated as >= 32 bytes after decoding (pepper & OTP secret)
  otpSecret: z
    .string()
    .min(16)
    .superRefine((val, ctx) => {
      const buf = decodeSecret(val.trim());
      if (buf.byteLength < 32) {
        ctx.addIssue({
          code: 'custom',
          message: 'OTP_SECRET must be >= 32 bytes',
        });
      }
    }),
  passwordHashPepper: z
    .string()
    .min(16)
    .superRefine((val, ctx) => {
      if (Buffer.from(val, 'utf8').byteLength < 32) {
        ctx.addIssue({
          code: 'custom',
          message: 'PASSWORD_HASH_PEPPER must be >= 32 bytes',
        });
      }
    }),
});

export const configSchema = baseSchema.transform((baseConfig) => {
  const otpSecretBytes = decodeSecret(baseConfig.otpSecret.trim());
  return {
    ...baseConfig,
    otpSecretBytes,
    verificationEmailExpirationMs:
      baseConfig.verificationEmailExpirationMinutes * 60_000,
  };
});
