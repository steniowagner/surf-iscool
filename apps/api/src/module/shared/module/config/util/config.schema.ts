import { z } from 'zod';

import { envs } from '@shared-libs/load-env';

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
  supabaseUrl: z.url(),
  supabaseServiceRoleKey: z.string().min(1),
});

export const configSchema = baseSchema;
