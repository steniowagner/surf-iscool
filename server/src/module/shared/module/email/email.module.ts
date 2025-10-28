import { Module } from '@nestjs/common';

import { LoggerModule } from '@shared-modules/logger/logger.module';
import { ConfigModule } from '@shared-modules/config/config.module';

import { EmailService } from './service/email.service';

@Module({
  imports: [ConfigModule.forRoot(), LoggerModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
