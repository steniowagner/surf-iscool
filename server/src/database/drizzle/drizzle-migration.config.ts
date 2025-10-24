import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';
import fs from 'fs';

import schemas from './schemas';

const envs = {
  test: '.env.test',
  dev: '.env.dev',
  prod: '.env',
};

const envFile = envs[process.env.NODE_ENV as keyof typeof envs];

if (!fs.existsSync(envFile)) {
  throw new Error('.env file found');
}

dotenv.config({ path: envFile });

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
