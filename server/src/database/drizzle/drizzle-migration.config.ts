import { defineConfig } from 'drizzle-kit';
import path from 'path';

const srcPath = path.join(__dirname, '..', '..');

const iamSchema = path.join(
  srcPath,
  'module/iam/persistence/database.schema.ts',
);

export default defineConfig({
  schema: [iamSchema],
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
