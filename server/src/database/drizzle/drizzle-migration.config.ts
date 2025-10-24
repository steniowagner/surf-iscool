import { defineConfig } from 'drizzle-kit';

import schemas from './schemas';

export default defineConfig({
  schema: schemas,
  out: __dirname + '/migration',
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
});
