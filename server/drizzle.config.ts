import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema/**/*.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: 'localhost',
    user: 'postgres',
    password: 'postgres',
    database: 'surf_iscool',
    ssl: false,
  },
  strict: true,
  verbose: true,
} satisfies Config;
