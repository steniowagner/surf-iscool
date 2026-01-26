import { Module } from '@nestjs/common';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';

import { ConfigModule } from '@shared-modules/config/config.module';
import { IdentityModule } from '@src/module/identity/identity.module';
import { ScheduleModule } from '@src/module/schedule/schedule.module';
import { NotificationModule } from '@src/module/notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    NestScheduleModule.forRoot(),
    IdentityModule,
    ScheduleModule,
    NotificationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
