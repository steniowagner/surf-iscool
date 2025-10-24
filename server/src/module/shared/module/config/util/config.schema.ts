import { z } from 'zod';

import { envs } from './config.load-env';

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
  database: databaseSchema,
});
