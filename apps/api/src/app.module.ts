import { Module } from '@nestjs/common';

import { ConfigModule } from '@shared-modules/config/config.module';
import { IdentityModule } from '@src/module/identity/identity.module';
import { ScheduleModule } from '@src/module/schedule/schedule.module';

@Module({
  imports: [ConfigModule.forRoot(), IdentityModule, ScheduleModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
