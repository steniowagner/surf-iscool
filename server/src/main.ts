import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { GlobalExceptionFilter } from '@src/module/shared/http/rest/global-filter.exception';
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

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.setGlobalPrefix('api');
  app.useLogger(logger);

  await app.listen(port);

  logger.log({ message: `Application running on port ${port}` });
}

bootstrap();
