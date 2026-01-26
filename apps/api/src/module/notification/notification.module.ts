import { Module } from '@nestjs/common';

import { AuthModule } from '@shared-modules/auth/auth.module';
import { ConfigModule } from '@shared-modules/config/config.module';

import { NotificationPersistenceModule } from './persistence/notification-persistence.module';
import { NotificationController } from './http/rest/controller/notification.controller';
import { NotificationService } from './core/services/notification.service';

@Module({
  imports: [ConfigModule.forRoot(), NotificationPersistenceModule, AuthModule],
  providers: [NotificationService],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationModule {}
