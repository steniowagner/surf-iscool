import { Module } from '@nestjs/common';

import { AuthModule } from '@shared-modules/auth/auth.module';
import { ConfigModule } from '@shared-modules/config/config.module';

import { SchedulePersistenceModule } from './persistence/schedule-persistence.module';
import { AdminClassController } from './http/rest/controller/admin-class.controller';
import { StudentClassController } from './http/rest/controller/student-class.controller';
import { AdminClassService } from './core/services/admin-class.service';
import { StudentClassService } from './core/services/student-class.service';

@Module({
  imports: [ConfigModule.forRoot(), SchedulePersistenceModule, AuthModule],
  providers: [AdminClassService, StudentClassService],
  controllers: [AdminClassController, StudentClassController],
})
export class ScheduleModule {}
