import { Module } from '@nestjs/common';

import { AuthModule } from '@shared-modules/auth/auth.module';
import { ConfigModule } from '@shared-modules/config/config.module';
import { IdentityPersistenceModule } from '@src/module/identity/persistence/identity-persistence.module';

import { NotificationPersistenceModule } from './persistence/notification-persistence.module';
import { NotificationController } from './http/rest/controller/notification.controller';
import { DeviceController } from './http/rest/controller/device.controller';
import { AdminNotificationController } from './http/rest/controller/admin-notification.controller';
import { NotificationService } from './core/services/notification.service';
import { UserDeviceService } from './core/services/user-device.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    NotificationPersistenceModule,
    IdentityPersistenceModule,
    AuthModule,
  ],
  providers: [NotificationService, UserDeviceService],
  controllers: [
    NotificationController,
    DeviceController,
    AdminNotificationController,
  ],
  exports: [NotificationService, UserDeviceService],
})
export class NotificationModule {}
