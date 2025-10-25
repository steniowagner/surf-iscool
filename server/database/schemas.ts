import path from 'path';

const srcPath = path.join(__dirname, '..', './src');

const identitySchema = path.join(
  srcPath,
  'module/identity/persistence/database.schema.ts',
);

export default [identitySchema];
