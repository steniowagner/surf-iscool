import dotenv from 'dotenv';
import fs from 'fs';

const envToFileMapping = {
  test: '.env.test',
  dev: '.env.dev',
  prod: '.env',
};

export const envs = Object.keys(envToFileMapping);

export const loadEnv = () => {
  const envFile =
    envToFileMapping[process.env.NODE_ENV as keyof typeof envToFileMapping];

  if (!fs.existsSync(envFile)) {
    throw new Error('.env file found');
  }

  dotenv.config({ path: envFile });
};
