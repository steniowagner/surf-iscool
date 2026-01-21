import { Module } from '@nestjs/common';

import { AuthModule } from '@shared-modules/auth/auth.module';
import { ConfigModule } from '@shared-modules/config/config.module';

import { SchedulePersistenceModule } from './persistence/schedule-persistence.module';
import { AdminClassController } from './http/rest/controller/admin-class.controller';
import { AdminClassService } from './core/services/admin-class.service';

@Module({
  imports: [ConfigModule.forRoot(), SchedulePersistenceModule, AuthModule],
  providers: [AdminClassService],
  controllers: [AdminClassController],
})
export class ScheduleModule {}
