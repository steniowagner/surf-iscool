import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { loadEnv } from '@shared-libs/load-env';

loadEnv();

export const createTestApp = async (modules: any[]) => {
  const module = await Test.createTestingModule({
    imports: modules,
  }).compile();

  const app = module.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  await app.init();

  return { module, app };
};
