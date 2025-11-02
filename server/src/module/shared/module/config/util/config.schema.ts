import { z } from 'zod';

import { envs } from '@shared-libs/load-env';

export const environmentSchema = z.enum(envs);

export const databaseSchema = z.object({
  host: z.string(),
  port: z.coerce.number(),
  username: z.string(),
  password: z.string(),
  database: z.string(),
});

export const configSchema = z.object({
  env: environmentSchema,
  database: databaseSchema,
  port: z.coerce.number().positive().int(),
  passwordMinLength: z.coerce.number().positive().int(),
  verificationEmailExpirationMinutes: z.coerce.number().positive().int(),
  verificationEmailMaxAttempts: z.coerce.number().positive().int(),
  resendApiKey: z.string(),
  noReplyEmailSender: z.string(),
  otpSecret: z.string(),
  otpLength: z.coerce.number().positive().int(),
  passwordHashPepper: z.string(),
  passwordHashRounds: z.coerce.number().positive().int(),
});
