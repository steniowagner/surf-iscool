import { defineConfig } from 'drizzle-kit';

import { loadEnv } from '@shared-libs/env/load-env';

import schemas from './schemas';

loadEnv();

export default defineConfig({
  schema: schemas,
  out: __dirname + '/migration',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DATABASE_HOST as string,
    port: parseInt(process.env.PORT || '5432'),
    user: process.env.DATABASE_USERNAME as string,
    password: process.env.DATABASE_PASSWORD as string,
    database: process.env.DATABASE_NAME as string,
    ssl: false,
  },
  strict: true,
  verbose: true,
});
