import { Module } from '@nestjs/common';

import { AuthModule } from '@shared-modules/auth/auth.module';
import { ConfigModule } from '@shared-modules/config/config.module';
import { LoggerModule } from '@shared-modules/logger/logger.module';
import { IdentityPersistenceModule } from '@src/module/identity/persistence/identity-persistence.module';
import { SchedulePersistenceModule } from '@src/module/schedule/persistence/schedule-persistence.module';

import { NotificationPersistenceModule } from './persistence/notification-persistence.module';
import { NotificationController } from './http/rest/controller/notification.controller';
import { DeviceController } from './http/rest/controller/device.controller';
import { AdminNotificationController } from './http/rest/controller/admin-notification.controller';
import { NotificationService } from './core/services/notification.service';
import { UserDeviceService } from './core/services/user-device.service';
import { ClassReminderJob } from './jobs/class-reminder.job';
import { RateClassJob } from './jobs/rate-class.job';

@Module({
  imports: [
    ConfigModule.forRoot(),
    NotificationPersistenceModule,
    IdentityPersistenceModule,
    SchedulePersistenceModule,
    LoggerModule,
    AuthModule,
  ],
  providers: [
    NotificationService,
    UserDeviceService,
    ClassReminderJob,
    RateClassJob,
  ],
  controllers: [
    NotificationController,
    DeviceController,
    AdminNotificationController,
  ],
  exports: [NotificationService, UserDeviceService],
})
export class NotificationModule {}
