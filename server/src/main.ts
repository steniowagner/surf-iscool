import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { ConfigService } from '@shared-modules/config/service/config.service';
import { LoggerFactory } from '@shared-modules/logger/util/logger.factory';
import { loadEnv } from '@shared-libs/load-env';

import { AppModule } from './app.module';

loadEnv();

async function bootstrap() {
  const logger = LoggerFactory('appplication-main');
  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService>(ConfigService);
  const port = configService.get('port');

  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.setGlobalPrefix('api');
  app.useLogger(logger);

  await app.listen(port);

  logger.log({ message: `Application running on port ${port}` });
}

bootstrap();
