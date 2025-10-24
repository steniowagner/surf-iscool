import path from 'path';

const srcPath = path.join(__dirname, '..', '..');

const iamSchema = path.join(
  srcPath,
  'module/iam/persistence/database.schema.ts',
);

export default [iamSchema];
