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
  port: z.coerce.number().positive().int(),
  passwordMinLength: z.coerce.number().positive().int(),
  passwordHashSalt: z.coerce.number().positive().int(),
  verificationEmailExpirationMinutes: z.coerce.number().positive().int(),
  resendApiKey: z.string(),
  noReplyEmailSender: z.string(),
  database: databaseSchema,
});
