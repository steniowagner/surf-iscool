import { Global, Module } from '@nestjs/common';

import { AppLoggerService } from './service/app-logger.service';

@Global()
@Module({
  providers: [AppLoggerService],
  exports: [AppLoggerService],
})
export class LoggerModule {}
